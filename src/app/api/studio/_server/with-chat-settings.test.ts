import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { ApiErrorCode } from '@/lib/server/api-response';
import { settingsFailResponse, splitChatSettings } from './with-chat-settings';

const VALID_SETTINGS = {
  providerConfigs: [
    { provider: 'deepseek', apiKey: 'k', baseUrl: 'https://example.test' },
    { provider: 'laozhang', apiKey: 'k', baseUrl: 'https://example.test' },
  ],
  chatProvider: 'deepseek',
  chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
  generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip', quality: 'xhigh' },
  editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip', quality: 'xhigh' },
};

describe('splitChatSettings', () => {
  it('缺少 settings 返回失败', () => {
    const result = splitChatSettings({ kind: 'visual', model: 'seedream' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/设置|供应商/);
  });

  it('settings 非法返回失败', () => {
    const result = splitChatSettings({ settings: { chatProvider: 'deepseek' } });
    expect(result.ok).toBe(false);
  });

  it('合法时剥离 settings 并保留其余字段', () => {
    const result = splitChatSettings({
      settings: VALID_SETTINGS,
      kind: 'visual',
      model: 'seedream',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.chatProvider).toBe('deepseek');
    expect(result.rest).toEqual({ kind: 'visual', model: 'seedream' });
  });
});

describe('settingsFailResponse', () => {
  it('返回 400 与统一信封', async () => {
    const res = settingsFailResponse('请至少配置一个供应商');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      code: ApiErrorCode.INVALID_PARAMS,
      message: '请至少配置一个供应商',
      data: null,
    });
  });
});
