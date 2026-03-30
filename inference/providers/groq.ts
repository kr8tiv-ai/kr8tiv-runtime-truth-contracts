/**
 * Groq Provider — Qwen 3 32B (free tier, all companions)
 * @module inference/providers/groq
 */

import { OpenAICompatProvider } from './openai-compat.js';
import type { FrontierModelSpec } from './types.js';

const SPEC: FrontierModelSpec = {
  providerId: 'groq',
  modelId: 'qwen/qwen3-32b',
  displayName: 'Groq Qwen 3 32B (Free)',
  contextWindow: 128_000,
  pricing: { inputPer1M: 0.29, outputPer1M: 0.59 },
  apiBaseUrl: 'https://api.groq.com/openai/v1',
  apiKeyEnvVar: 'GROQ_API_KEY',
};

export const groqProvider = new OpenAICompatProvider('groq', SPEC);
export default groqProvider;
