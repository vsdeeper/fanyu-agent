import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/chat/_server/request-settings', () => ({
  getChatSettings: vi.fn(),
}));

import { getChatSettings } from '@/app/api/chat/_server/request-settings';
import { DEFAULT_DEEPSEEK_REASONING_EFFORT } from '@/app/api/chat/_shared/chat-settings';

import { getDeepseekReasoningEffort } from './constants';

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
      generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip', quality: 'xhigh' },
      editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip', quality: 'xhigh' },
    });
    expect(getDeepseekReasoningEffort()).toBe(DEFAULT_DEEPSEEK_REASONING_EFFORT);
  });

  it('合法 reasoningEffort 原样返回', () => {
    getSettings.mockReturnValue({
      providerConfigs: [],
      chatProvider: 'deepseek',
      chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
      reasoningEffort: 'low',
      generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip', quality: 'xhigh' },
      editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip', quality: 'xhigh' },
    });
    expect(getDeepseekReasoningEffort()).toBe('low');
  });

  it('none 与 max 原样返回', () => {
    const base = {
      providerConfigs: [],
      chatProvider: 'deepseek' as const,
      chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
      generateImage: {
        provider: 'laozhang' as const,
        modelId: 'gpt-image-2.5-flare-vip',
        quality: 'xhigh' as const,
      },
      editImage: {
        provider: 'laozhang' as const,
        modelId: 'gpt-image-2.5-sunburst-vip',
        quality: 'xhigh' as const,
      },
    };
    getSettings.mockReturnValue({ ...base, reasoningEffort: 'none' });
    expect(getDeepseekReasoningEffort()).toBe('none');
    getSettings.mockReturnValue({ ...base, reasoningEffort: 'max' });
    expect(getDeepseekReasoningEffort()).toBe('max');
  });

  it('OpenAI 旧档位 minimal/medium/xhigh 回落 high', () => {
    for (const reasoningEffort of ['minimal', 'medium', 'xhigh']) {
      getSettings.mockReturnValue({
        providerConfigs: [],
        chatProvider: 'deepseek',
        chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
        reasoningEffort,
        generateImage: {
          provider: 'laozhang',
          modelId: 'gpt-image-2.5-flare-vip',
          quality: 'xhigh',
        },
        editImage: {
          provider: 'laozhang',
          modelId: 'gpt-image-2.5-sunburst-vip',
          quality: 'xhigh',
        },
      });
      expect(getDeepseekReasoningEffort()).toBe(DEFAULT_DEEPSEEK_REASONING_EFFORT);
    }
  });
});
