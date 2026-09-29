import {
  filterProvidersByCapability,
  type ChatProviderId,
  type ChatSettingsPayload,
  type ProviderCredential,
  type ProviderKind,
} from '@/app/api/chat/_shared/chat-settings';

export const CHAT_SETTINGS_STORAGE_KEY = 'fanyu-chat-settings';

type Listener = () => void;

let cached: ChatSettingsPayload | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

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

/** 订阅设置变更（供 useSyncExternalStore） */
export function subscribeChatSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChatSettingsSnapshot(): ChatSettingsPayload | null {
  return cached;
}

export function getChatSettingsServerSnapshot(): ChatSettingsPayload | null {
  return null;
}

export function isChatSettingsHydrated(): boolean {
  return hydrated;
}

/** 客户端挂载后从 localStorage 恢复 */
export function hydrateChatSettings(): void {
  if (hydrated) return;
  cached = readStorage();
  hydrated = true;
  notify();
}

export function setChatSettings(settings: ChatSettingsPayload): void {
  cached = settings;
  hydrated = true;
  writeStorage(settings);
  notify();
}

export function setChatProvider(chatProvider: ChatProviderId): void {
  if (!cached) return;
  setChatSettings({ ...cached, chatProvider });
}

/** 从已配置列表取具备 chat 的供应商选项 */
export function listChatProviderOptions(
  configs: readonly ProviderCredential[],
): { value: ChatProviderId; label: string }[] {
  return filterProvidersByCapability(configs, 'chat').map((item) => ({
    value: item.provider as ChatProviderId,
    label: item.provider,
  }));
}

export function listCapabilityProviderOptions(
  configs: readonly ProviderCredential[],
  capability: 'generate' | 'edit',
): { value: ProviderKind; label: string }[] {
  return filterProvidersByCapability(configs, capability).map((item) => ({
    value: item.provider,
    label: item.provider,
  }));
}
