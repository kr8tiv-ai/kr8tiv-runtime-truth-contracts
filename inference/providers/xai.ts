/**
 * xAI Provider — Grok 4.20 (powers Forge)
 * @module inference/providers/xai
 */

import { OpenAICompatProvider } from './openai-compat.js';
import type { FrontierModelSpec } from './types.js';

const SPEC: FrontierModelSpec = {
  providerId: 'xai',
  modelId: 'grok-4.20',
  displayName: 'xAI Grok 4.20',
  contextWindow: 2_000_000,
  pricing: { inputPer1M: 2.0, outputPer1M: 6.0 },
  apiBaseUrl: 'https://api.x.ai/v1',
  apiKeyEnvVar: 'XAI_API_KEY',
};

export const xaiProvider = new OpenAICompatProvider('xai', SPEC);
export default xaiProvider;
