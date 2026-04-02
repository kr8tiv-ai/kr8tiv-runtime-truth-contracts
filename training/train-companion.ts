/**
 * Training Orchestrator CLI — Single entry point for companion model fine-tuning.
 *
 * Validates prerequisites, invokes the Python fine-tune script, generates an
 * Ollama Modelfile, registers the model with Ollama, and verifies it responds.
 *
 * Usage:
 *   npx tsx training/train-companion.ts --companion-id cipher
 *   npx tsx training/train-companion.ts --companion-id cipher --dry-run
 *   npx tsx training/train-companion.ts --companion-id cipher --skip-training
 *
 * @module training/train-companion
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { COMPANION_SHORT_PROMPTS } from '../inference/companion-prompts.js';
import {
  generateModelfile,
  getModelName,
} from './modelfile-generator.js';
import { OllamaClient } from '../inference/local-llm.js';

// ============================================================================
// Types
// ============================================================================

export interface TrainCompanionArgs {
  companionId: string;
  dataPath: string;
  baseModel: string;
  outputDir: string;
  dryRun: boolean;
  skipTraining: boolean;
}

// ============================================================================
// Logging
// ============================================================================

function log(msg: string): void {
  console.log(`[train-companion] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[train-companion] WARNING: ${msg}`);
}

function fatal(msg: string): never {
  console.error(`[train-companion] ERROR: ${msg}`);
  process.exit(1);
}

// ============================================================================
// Argument Parsing
// ============================================================================

export function parseArgs(argv: string[]): TrainCompanionArgs {
  const args: Partial<TrainCompanionArgs> = {
    dryRun: false,
    skipTraining: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--companion-id':
        args.companionId = argv[++i];
        break;
      case '--data-path':
        args.dataPath = argv[++i];
        break;
      case '--base-model':
        args.baseModel = argv[++i];
        break;
      case '--output-dir':
        args.outputDir = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--skip-training':
        args.skipTraining = true;
        break;
    }
  }

  if (!args.companionId) {
    fatal('--companion-id is required');
  }

  const companionId = args.companionId;

  return {
    companionId,
    dataPath:
      args.dataPath ??
      path.join('data', 'training', companionId, 'training.jsonl'),
    baseModel:
      args.baseModel ?? 'unsloth/Llama-3.2-1B-Instruct-bnb-4bit',
    outputDir:
      args.outputDir ?? path.join('training', 'output', companionId),
    dryRun: args.dryRun ?? false,
    skipTraining: args.skipTraining ?? false,
  };
}

// ============================================================================
// Prerequisite Validation
// ============================================================================

export function validateCompanionId(companionId: string): void {
  const prompt = COMPANION_SHORT_PROMPTS[companionId];
  if (prompt === undefined) {
    const available = Object.keys(COMPANION_SHORT_PROMPTS).join(', ');
    throw new Error(
      `Unknown companionId "${companionId}". Available: ${available}`,
    );
  }
  log(`✓ Companion "${companionId}" is valid`);
}

export function validateDataFile(dataPath: string): void {
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `Training data file not found: ${dataPath}`,
    );
  }
  const stat = fs.statSync(dataPath);
  if (stat.size === 0) {
    throw new Error(
      `Training data file is empty: ${dataPath}`,
    );
  }
  log(`✓ Data file exists: ${dataPath} (${stat.size} bytes)`);
}

export async function validateOllama(): Promise<OllamaClient> {
  const client = new OllamaClient();
  const health = await client.checkHealth();
  if (!health.healthy) {
    throw new Error(
      `Ollama is not running or unreachable: ${health.error ?? 'unknown error'}`,
    );
  }
  log(`✓ Ollama is healthy (v${health.version ?? 'unknown'}, ${Math.round(health.latencyMs)}ms)`);
  return client;
}

export function validatePython(): string {
  // Try python3 first, then python
  for (const cmd of ['python3', 'python']) {
    try {
      const version = execSync(`${cmd} --version`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      log(`✓ Python found: ${version} (${cmd})`);
      return cmd;
    } catch {
      // Try next
    }
  }
  throw new Error(
    'Python not found. Install Python 3.10+ and ensure python3 or python is on PATH.',
  );
}

// ============================================================================
// Windows → WSL Path Translation
// ============================================================================

/**
 * Convert a Windows path (e.g. C:\Users\foo) to a WSL path (/mnt/c/Users/foo).
 * Only transforms paths that look like Windows absolute paths. Passes others through.
 */
export function toWslPath(windowsPath: string): string {
  // Match drive letter pattern: C:\ or C:/
  const match = /^([A-Za-z]):[/\\](.*)$/.exec(windowsPath);
  if (!match) return windowsPath;
  const driveLetter = match[1]!.toLowerCase();
  const rest = match[2]!.replace(/\\/g, '/');
  return `/mnt/${driveLetter}/${rest}`;
}

// ============================================================================
// Python Training Invocation
// ============================================================================

export function buildPythonArgs(
  pythonCmd: string,
  args: TrainCompanionArgs,
): { command: string; spawnArgs: string[] } {
  const isWindows = process.platform === 'win32';
  const scriptPath = path.join('training', 'fine-tune.py');

  // Build the Python script arguments
  const scriptArgs: string[] = [
    '--companion-id', args.companionId,
    '--data-path', isWindows ? toWslPath(path.resolve(args.dataPath)) : args.dataPath,
    '--base-model', args.baseModel,
    '--output-dir', isWindows ? toWslPath(path.resolve(args.outputDir)) : args.outputDir,
  ];

  if (args.dryRun) {
    scriptArgs.push('--dry-run');
  }

  if (isWindows) {
    // Run Python through WSL
    return {
      command: 'wsl',
      spawnArgs: [pythonCmd, toWslPath(path.resolve(scriptPath)), ...scriptArgs],
    };
  }

  return {
    command: pythonCmd,
    spawnArgs: [scriptPath, ...scriptArgs],
  };
}

export function runPythonTraining(
  pythonCmd: string,
  args: TrainCompanionArgs,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { command, spawnArgs } = buildPythonArgs(pythonCmd, args);

    log(`Running: ${command} ${spawnArgs.join(' ')}`);

    const child = spawn(command, spawnArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      process.stderr.write(data);
    });

    child.on('error', (err) => {
      reject(
        new Error(`Failed to spawn Python process: ${err.message}`),
      );
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Python training failed with exit code ${code ?? 'null'}.\n` +
              `stderr: ${stderr.slice(-500)}`,
          ),
        );
      } else {
        log('✓ Python training completed successfully');
        resolve();
      }
    });
  });
}

// ============================================================================
// Modelfile Generation & Ollama Registration
// ============================================================================

export function generateAndWriteModelfile(
  companionId: string,
  outputDir: string,
): { modelfilePath: string; modelName: string } {
  const ggufPath = path.join(outputDir, 'unsloth.Q4_K_M.gguf');
  log(`Generating Modelfile for companion "${companionId}" with GGUF: ${ggufPath}`);

  const result = generateModelfile({
    companionId,
    ggufPath,
    outputDir,
  });

  log(`✓ Modelfile written to: ${result.modelfilePath}`);
  return { modelfilePath: result.modelfilePath, modelName: result.modelName };
}

export function registerWithOllama(
  modelName: string,
  modelfilePath: string,
): void {
  log(`Registering model "${modelName}" with Ollama...`);
  try {
    const output = execSync(
      `ollama create ${modelName} -f ${modelfilePath}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    log(`✓ Ollama registration output: ${output.trim()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to register model with Ollama: ${msg}`);
  }
}

export async function verifyModel(
  client: OllamaClient,
  modelName: string,
): Promise<void> {
  log(`Verifying model "${modelName}" is loaded...`);
  const hasIt = await client.hasModel(modelName);
  if (!hasIt) {
    warn(`Model "${modelName}" not found in Ollama model list. It may still be loading.`);
    return;
  }
  log(`✓ Model "${modelName}" is registered in Ollama`);

  // Send a test message
  try {
    const response = await client.chat({
      model: modelName,
      messages: [{ role: 'user', content: 'Hello, who are you?' }],
    });
    log(`✓ Test chat response: "${response.message.content.slice(0, 100)}..."`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warn(`Test chat failed (model may need time to load): ${msg}`);
  }
}

// ============================================================================
// Summary
// ============================================================================

export async function printSummary(
  client: OllamaClient,
  modelName: string,
  ggufPath: string,
  modelfilePath: string,
): Promise<void> {
  log('─── Training Pipeline Summary ───');
  log(`  Model name:    ${modelName}`);
  log(`  GGUF path:     ${ggufPath}`);
  log(`  Modelfile:     ${modelfilePath}`);

  try {
    const info = await client.getModelInfo(modelName);
    if (info.details) {
      log(`  Parameter size: ${info.details.parameter_size}`);
      log(`  Quantization:   ${info.details.quantization_level}`);
    }
  } catch {
    log('  (model info not available yet)');
  }

  log('────────────────────────────────');
}

// ============================================================================
// Main Pipeline
// ============================================================================

export async function runPipeline(args: TrainCompanionArgs): Promise<void> {
  log(`Starting training pipeline for companion "${args.companionId}"`);
  log(`  Data path:    ${args.dataPath}`);
  log(`  Base model:   ${args.baseModel}`);
  log(`  Output dir:   ${args.outputDir}`);
  log(`  Dry run:      ${args.dryRun}`);
  log(`  Skip training: ${args.skipTraining}`);

  // ── Step 1: Validate prerequisites ────────────────────────────────────
  validateCompanionId(args.companionId);

  if (!args.skipTraining) {
    validateDataFile(args.dataPath);
  }

  const ollamaClient = await validateOllama();

  let pythonCmd = 'python3';
  if (!args.skipTraining) {
    pythonCmd = validatePython();
  }

  // ── Step 2: Run Python training ───────────────────────────────────────
  if (!args.skipTraining) {
    await runPythonTraining(pythonCmd, args);
  } else {
    log('Skipping Python training (--skip-training)');
  }

  // ── Step 3: Generate Modelfile ────────────────────────────────────────
  const { modelfilePath, modelName } = generateAndWriteModelfile(
    args.companionId,
    args.outputDir,
  );
  const ggufPath = path.join(args.outputDir, 'unsloth.Q4_K_M.gguf');

  // ── Step 4: Register with Ollama ──────────────────────────────────────
  registerWithOllama(modelName, modelfilePath);

  // ── Step 5: Verify model ──────────────────────────────────────────────
  await verifyModel(ollamaClient, modelName);

  // ── Step 6: Print summary ─────────────────────────────────────────────
  await printSummary(ollamaClient, modelName, ggufPath, modelfilePath);

  log('Pipeline complete!');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  try {
    await runPipeline(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fatal(msg);
  }
}

// Only run main when executed directly (not when imported for testing)
const isDirectExecution =
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('train-companion.ts') === true;

if (isDirectExecution) {
  main().catch((err) => {
    fatal(err instanceof Error ? err.message : String(err));
  });
}
