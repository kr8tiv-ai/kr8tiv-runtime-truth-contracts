/**
 * OpenAI Provider — GPT-5.4 (powers Cipher)
 * @module inference/providers/openai
 */

import { OpenAICompatProvider } from './openai-compat.js';
import type { FrontierModelSpec } from './types.js';

const SPEC: FrontierModelSpec = {
  providerId: 'openai',
  modelId: 'gpt-5.4',
  displayName: 'OpenAI GPT-5.4',
  contextWindow: 1_050_000,
  pricing: { inputPer1M: 2.5, outputPer1M: 15.0 },
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKeyEnvVar: 'OPENAI_API_KEY',
};

export const openaiProvider = new OpenAICompatProvider('openai', SPEC);
export default openaiProvider;
