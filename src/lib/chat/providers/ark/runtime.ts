import type { UserLocation } from '@/lib/geo/types';

import { getArkClient } from './client';
import { getArkInstructions } from './instructions';
import type { ChatProviderRuntime } from '../types';

/** 方舟 Provider 运行时：web_search 定位、instructions 合并 */
export const arkRuntime: ChatProviderRuntime = {
  getClient: getArkClient,

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
