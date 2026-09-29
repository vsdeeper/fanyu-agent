import { AsyncLocalStorage } from 'node:async_hooks';

import type { ChatSettingsPayload } from '@/app/api/chat/_shared/chat-settings';
import { findCredential, type ProviderKind } from '@/app/api/chat/_shared/chat-settings';

const storage = new AsyncLocalStorage<ChatSettingsPayload>();

/** 在请求作用域内挂载 settings，供 config/clients/tools 读取 */
export function runWithChatSettings<T>(settings: ChatSettingsPayload, fn: () => T): T {
  return storage.run(settings, fn);
}

export function getChatSettings(): ChatSettingsPayload | undefined {
  return storage.getStore();
}

export type ResolvedCredential = {
  apiKey: string;
  baseUrl: string;
};

/**
 * 仅从本轮 settings.providerConfigs 解析凭据；找不到或字段空则抛错，禁止回退 env。
 */
export function resolveCredentialFromSettings(kind: ProviderKind): ResolvedCredential {
  const settings = getChatSettings();
  if (!settings) {
    throw new Error(`缺少对话设置，无法解析供应商 ${kind}`);
  }
  const row = findCredential(settings.providerConfigs, kind);
  const apiKey = row?.apiKey?.trim() ?? '';
  const baseUrl = row?.baseUrl?.trim() ?? '';
  if (!apiKey || !baseUrl) {
    throw new Error(`供应商 ${kind} 未配置密钥或 Base URL`);
  }
  return { apiKey, baseUrl };
}
