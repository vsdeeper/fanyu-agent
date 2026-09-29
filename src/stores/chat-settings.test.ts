/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('client-only', () => ({}));

const memory = new Map<string, string>();

vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
  },
});

import {
  parseChatSettingsPayload,
  type ChatSettingsPayload,
} from '@/app/api/chat/_shared/chat-settings';
import { CHAT_SETTINGS_STORAGE_KEY, useChatSettingsStore } from './chat-settings';

const VALID: ChatSettingsPayload = {
  providerConfigs: [
    { provider: 'deepseek', apiKey: 'k', baseUrl: 'https://example.test' },
    { provider: 'laozhang', apiKey: 'k', baseUrl: 'https://example.test' },
  ],
  chatProvider: 'deepseek',
  chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
  generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip' },
  editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip' },
};

beforeEach(() => {
  memory.clear();
  useChatSettingsStore.setState({ settings: null, hydrated: false });
});

describe('useChatSettingsStore', () => {
  it('hydrate 时丢弃非法 localStorage', () => {
    memory.set(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify({ chatProvider: 'x' }));
    useChatSettingsStore.getState().hydrate();
    expect(useChatSettingsStore.getState().settings).toBeNull();
    expect(useChatSettingsStore.getState().hydrated).toBe(true);
  });

  it('hydrate 时恢复合法设置', () => {
    expect(parseChatSettingsPayload(VALID).ok).toBe(true);
    memory.set(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(VALID));
    useChatSettingsStore.getState().hydrate();
    expect(useChatSettingsStore.getState().settings).toEqual(VALID);
  });

  it('setSettings 拒绝非法载荷', () => {
    useChatSettingsStore
      .getState()
      .setSettings({ chatProvider: 'deepseek' } as ChatSettingsPayload);
    expect(useChatSettingsStore.getState().settings).toBeNull();
    expect(memory.get(CHAT_SETTINGS_STORAGE_KEY)).toBeUndefined();
  });

  it('setSettings 写入合法载荷', () => {
    useChatSettingsStore.getState().setSettings(VALID);
    expect(useChatSettingsStore.getState().settings).toEqual(VALID);
    expect(JSON.parse(memory.get(CHAT_SETTINGS_STORAGE_KEY)!)).toEqual(VALID);
  });
});
