import { useEffect } from 'react';

import { useChatSettingsStore } from '../store';

/** 对话设置：localStorage 持久化 + 底栏/Modal 共享 */
export function useChatSettings() {
  const settings = useChatSettingsStore((s) => s.settings);
  const hydrate = useChatSettingsStore((s) => s.hydrate);
  const setSettings = useChatSettingsStore((s) => s.setSettings);
  const setChatProvider = useChatSettingsStore((s) => s.setChatProvider);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return {
    settings,
    updateSettings: setSettings,
    updateChatProvider: setChatProvider,
    ready: settings != null,
  };
}
