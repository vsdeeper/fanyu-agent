import type { UserLocation } from '@/app/api/geo/_shared/types';

import { getArkClient } from './client';
import { getArkInstructions } from './instructions';
import type { ChatProviderRuntime } from '../types';

/** 方舟 Provider 运行时：web_search 定位、instructions 合并 */
export const arkRuntime: ChatProviderRuntime = {
  getClient: getArkClient,

  getMainModel(modelId: string) {
    return getArkClient().responses(modelId);
  },

  getCapabilities() {
    return { acceptsImageInput: false, usesSdkWebSearchTool: true, needsOpenaiStoreFalse: true };
  },

  getWebSearchArgs(userLocation: UserLocation | undefined) {
    return userLocation?.type === 'approximate' ? { userLocation } : {};
  },

  getInstructions({ baseInstructions }) {
    return getArkInstructions(baseInstructions);
  },

  getOpenAIOptions() {
    return {};
  },
};
