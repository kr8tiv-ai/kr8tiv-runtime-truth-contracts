/**
 * Z.ai (Zhipu AI) Provider — GLM-4.6 (powers Catalyst)
 * @module inference/providers/zai
 */

import { OpenAICompatProvider } from './openai-compat.js';
import type { FrontierModelSpec } from './types.js';

const SPEC: FrontierModelSpec = {
  providerId: 'zai',
  modelId: 'glm-4.6',
  displayName: 'Z.ai GLM-4.6',
  contextWindow: 200_000,
  pricing: { inputPer1M: 0.39, outputPer1M: 1.9 },
  apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKeyEnvVar: 'ZAI_API_KEY',
};

export const zaiProvider = new OpenAICompatProvider('zai', SPEC);
export default zaiProvider;
