import 'client-only';

import type { ChatSettingsPayload } from '@/app/api/chat/_shared/chat-settings';
import { getAntdMessage } from '@/lib/client/antd-message';
import { useChatSettingsStore } from '@/stores/chat-settings';

export const CHAT_SETTINGS_REQUIRED = '请先在对话页完成设置（供应商与模型）';

/**
 * 读取已 hydrate 的对话设置；未配置时 Toast 并抛错（由调用方中止）。
 * 调用前应确保 store 已 hydrate（本函数会尝试同步 hydrate）。
 */
export function getRequiredChatSettings(): ChatSettingsPayload {
  const store = useChatSettingsStore.getState();
  if (!store.hydrated) {
    store.hydrate();
  }
  const settings = useChatSettingsStore.getState().settings;
  if (!settings) {
    try {
      getAntdMessage().warning(CHAT_SETTINGS_REQUIRED);
    } catch {
      // 测试或 App 未挂载时仍抛错，由调用方处理
    }
    throw new Error(CHAT_SETTINGS_REQUIRED);
  }
  return settings;
}

/** 把对话 settings 合并进请求体（顶层字段） */
export function withChatSettingsBody<T>(body: T): T & { settings: ChatSettingsPayload } {
  return { ...(body as object), settings: getRequiredChatSettings() } as T & {
    settings: ChatSettingsPayload;
  };
}
