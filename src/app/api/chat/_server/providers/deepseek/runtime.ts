import { getDeepseekReasoningEffort } from './constants';
import { getDeepseekClient } from './client';
import { getDeepseekInstructions } from './instructions';
import { encodeReasoningPassback, extractReasoningTexts } from './reasoning-passback';
import type { ChatProviderRuntime } from '../types';

/** DeepSeek Provider 运行时：instructions+passback、forceReasoning */
export const deepseekRuntime: ChatProviderRuntime = {
  getClient: getDeepseekClient,

  getMainModel(modelId: string) {
    return getDeepseekClient().responses(modelId);
  },

  getCapabilities() {
    return { acceptsImageInput: false, usesSdkWebSearchTool: true, needsOpenaiStoreFalse: true };
  },

  getWebSearchArgs() {
    return {};
  },

  getInstructions({ userLocation, baseInstructions, convertedMessages }) {
    const withProviderHints = getDeepseekInstructions({ userLocation, baseInstructions });
    return encodeReasoningPassback(withProviderHints, extractReasoningTexts(convertedMessages));
  },

  getOpenAIOptions() {
    return {
      forceReasoning: true,
      reasoningEffort: getDeepseekReasoningEffort(),
      systemMessageMode: 'system' as const,
    };
  },
};
