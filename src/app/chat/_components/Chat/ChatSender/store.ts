import 'client-only';

import { create } from 'zustand';
import type { ChatProviderId, ChatSettingsPayload } from '@/app/api/chat/_shared/chat-settings';

export const CHAT_SETTINGS_STORAGE_KEY = 'fanyu-chat-settings';

export type ChatSettingsStore = {
  settings: ChatSettingsPayload | null;
  hydrated: boolean;
  /** 客户端挂载后从 localStorage 恢复（只执行一次） */
  hydrate: () => void;
  setSettings: (settings: ChatSettingsPayload) => void;
  setChatProvider: (chatProvider: ChatProviderId) => void;
};

function readStorage(): ChatSettingsPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatSettingsPayload;
  } catch {
    return null;
  }
}

function writeStorage(settings: ChatSettingsPayload) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

/** 对话设置：localStorage 持久化 + 底栏/Modal 共享 */
export const useChatSettingsStore = create<ChatSettingsStore>((set, get) => ({
  settings: null,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ settings: readStorage(), hydrated: true });
  },
  setSettings: (settings) => {
    writeStorage(settings);
    set({ settings, hydrated: true });
  },
  setChatProvider: (chatProvider) => {
    const cur = get().settings;
    if (!cur) return;
    get().setSettings({ ...cur, chatProvider });
  },
}));
