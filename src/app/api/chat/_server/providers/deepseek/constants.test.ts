import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/chat/_server/request-settings', () => ({
  getChatSettings: vi.fn(),
}));

import { getChatSettings } from '@/app/api/chat/_server/request-settings';
import { DEFAULT_DEEPSEEK_REASONING_EFFORT, getDeepseekReasoningEffort } from './constants';

const getSettings = vi.mocked(getChatSettings);

describe('getDeepseekReasoningEffort', () => {
  it('无 ALS settings 时抛错', () => {
    getSettings.mockReturnValue(undefined);
    expect(() => getDeepseekReasoningEffort()).toThrow(/对话设置/);
  });

  it('有 settings 但未填 reasoningEffort 时用默认值', () => {
    getSettings.mockReturnValue({
      providerConfigs: [],
      chatProvider: 'deepseek',
      chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
      generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip' },
      editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip' },
    });
    expect(getDeepseekReasoningEffort()).toBe(DEFAULT_DEEPSEEK_REASONING_EFFORT);
  });

  it('合法 reasoningEffort 原样返回', () => {
    getSettings.mockReturnValue({
      providerConfigs: [],
      chatProvider: 'deepseek',
      chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
      reasoningEffort: 'low',
      generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip' },
      editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip' },
    });
    expect(getDeepseekReasoningEffort()).toBe('low');
  });
});
