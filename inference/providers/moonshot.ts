/**
 * Moonshot AI Provider — Kimi K2.5 (powers Aether)
 * @module inference/providers/moonshot
 */

import { OpenAICompatProvider } from './openai-compat.js';
import type { FrontierModelSpec } from './types.js';

const SPEC: FrontierModelSpec = {
  providerId: 'moonshot',
  modelId: 'kimi-k2.5',
  displayName: 'Moonshot Kimi K2.5',
  contextWindow: 256_000,
  pricing: { inputPer1M: 0.6, outputPer1M: 3.0 },
  apiBaseUrl: 'https://api.moonshot.cn/v1',
  apiKeyEnvVar: 'MOONSHOT_API_KEY',
};

export const moonshotProvider = new OpenAICompatProvider('moonshot', SPEC);
export default moonshotProvider;
