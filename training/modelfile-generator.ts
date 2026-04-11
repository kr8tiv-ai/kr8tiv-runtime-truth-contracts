/**
 * Modelfile Generator — Bridges fine-tuned GGUF models to Ollama.
 *
 * Reads companion short prompts and templates Ollama Modelfiles with the
 * correct base model reference, system prompt, and model-family-specific
 * parameters (stop tokens, context length).
 *
 * Supports: Llama 3.2, Gemma 4, Qwen 2.5
 *
 * @module training/modelfile-generator
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  COMPANION_SHORT_PROMPTS,
  getAvailableCompanions,
} from '../inference/companion-prompts.js';

// ============================================================================
// Types
// ============================================================================

/** Supported model families for stop token and parameter selection */
export type ModelFamily = 'llama' | 'gemma' | 'qwen';

export interface GenerateModelfileOptions {
  /** Companion ID (must exist in COMPANION_SHORT_PROMPTS) */
  companionId: string;
  /** Absolute or relative path to the GGUF model file */
  ggufPath?: string;
  /** Model reference for FROM line (e.g. 'hf.co/kr8tiv/kin-cipher-GGUF:Q4_K_M').
   *  When provided, used instead of ggufPath. At least one of ggufPath or modelRef is required. */
  modelRef?: string;
  /** Output directory for the Modelfile (default: training/output/{companionId}) */
  outputDir?: string;
  /** Model family for stop tokens and parameters (default: 'llama' for backward compat) */
  modelFamily?: ModelFamily;
}

export interface GenerateModelfileResult {
  /** Full path to the written Modelfile */
  modelfilePath: string;
  /** The Modelfile content string */
  modelfileContent: string;
  /** The Ollama model name (kin-{companionId}) */
  modelName: string;
}

// ============================================================================
// Model Family Stop Tokens
// ============================================================================

/** Llama 3.2 stop tokens (default for backward compatibility) */
const LLAMA_STOP_TOKENS = [
  '<|start_header_id|>',
  '<|end_header_id|>',
  '<|eot_id|>',
];

/** Gemma 4 stop tokens */
const GEMMA_STOP_TOKENS = [
  '<start_of_turn>',
  '<end_of_turn>',
];

/** Qwen 2.5 stop tokens */
const QWEN_STOP_TOKENS = [
  '<|im_start|>',
  '<|im_end|>',
  '<|endoftext|>',
];

function getStopTokens(family: ModelFamily): string[] {
  switch (family) {
    case 'gemma':
      return GEMMA_STOP_TOKENS;
    case 'qwen':
      return QWEN_STOP_TOKENS;
    case 'llama':
    default:
      return LLAMA_STOP_TOKENS;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the Ollama model name for a companion.
 *
 * @param companionId — one of the six Genesis KIN companion IDs
 * @returns model name in the format `kin-{companionId}`
 */
export function getModelName(companionId: string): string {
  return `kin-${companionId}`;
}

/**
 * Generate an Ollama Modelfile for a fine-tuned companion model.
 *
 * Validates the companionId, builds the Modelfile content with the companion's
 * short prompt and Llama 3.2 parameters, writes it to disk, and returns
 * the path, content, and model name.
 *
 * @throws {Error} if companionId is not a known companion
 */
export function generateModelfile(
  options: GenerateModelfileOptions,
): GenerateModelfileResult {
  const { companionId, ggufPath, modelRef, outputDir, modelFamily } = options;
  const family: ModelFamily = modelFamily ?? 'llama';

  // ── Validate that at least one model source is provided ───────────────
  if (!modelRef && !ggufPath) {
    throw new Error(
      'Either modelRef or ggufPath must be provided to generateModelfile().',
    );
  }

  // ── Validate companion ID ─────────────────────────────────────────────
  const available = getAvailableCompanions();
  const shortPrompt = COMPANION_SHORT_PROMPTS[companionId];

  if (!available.includes(companionId) || shortPrompt === undefined) {
    throw new Error(
      `Unknown companionId "${companionId}". ` +
        `Available companions: ${available.join(', ')}`,
    );
  }

  // ── Build Modelfile content (prefer modelRef over ggufPath) ───────────
  const fromValue = modelRef ?? ggufPath;
  const stopTokens = getStopTokens(family);
  const stopLines = stopTokens.map((t) => `PARAMETER stop "${t}"`);

  const modelfileContent = [
    `FROM ${fromValue}`,
    `SYSTEM """${shortPrompt}"""`,
    `PARAMETER temperature 0.7`,
    `PARAMETER top_p 0.9`,
    // Use 4096 context for 6GB VRAM optimization (RTX 4050 etc.)
    `PARAMETER num_ctx 4096`,
    ...stopLines,
    '', // trailing newline
  ].join('\n');

  // ── Write to disk ─────────────────────────────────────────────────────
  const resolvedDir =
    outputDir ?? path.join('training', 'output', companionId);
  fs.mkdirSync(resolvedDir, { recursive: true });

  const modelfilePath = path.join(resolvedDir, 'Modelfile');
  fs.writeFileSync(modelfilePath, modelfileContent, 'utf-8');

  const modelName = getModelName(companionId);

  return { modelfilePath, modelfileContent, modelName };
}
