import { getDeepseekReasoningEffort } from './constants';
import { getDeepseekClient } from './client';
import { getDeepseekInstructions } from './instructions';
import { encodeReasoningPassback, extractReasoningTexts } from './reasoning-passback';
import type { ChatProviderRuntime } from '../types';

/** DeepSeek Provider 运行时：instructions+passback、forceReasoning */
export const deepseekRuntime: ChatProviderRuntime = {
  getClient: getDeepseekClient,

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
