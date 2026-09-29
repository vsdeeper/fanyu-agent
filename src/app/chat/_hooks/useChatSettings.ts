import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { ChatProviderId, ChatSettingsPayload } from '@/app/api/chat/_shared/chat-settings';
import {
  getChatSettingsServerSnapshot,
  getChatSettingsSnapshot,
  hydrateChatSettings,
  setChatProvider,
  setChatSettings,
  subscribeChatSettings,
} from '@/app/chat/_utils/chat-settings';

/** 对话设置：localStorage 持久化 + 底栏/Modal 共享 */
export function useChatSettings() {
  const settings = useSyncExternalStore(
    subscribeChatSettings,
    getChatSettingsSnapshot,
    getChatSettingsServerSnapshot,
  );

  useEffect(() => {
    hydrateChatSettings();
  }, []);

  const updateSettings = useCallback((next: ChatSettingsPayload) => {
    setChatSettings(next);
  }, []);

  const updateChatProvider = useCallback((chatProvider: ChatProviderId) => {
    setChatProvider(chatProvider);
  }, []);

  return {
    settings,
    updateSettings,
    updateChatProvider,
    ready: settings != null,
  };
}
