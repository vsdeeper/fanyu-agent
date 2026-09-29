import 'server-only';

import {
  parseChatSettingsPayload,
  type ChatSettingsPayload,
} from '@/app/api/chat/_shared/chat-settings';
import { runWithChatSettings } from '@/app/api/chat/_server/request-settings';
import { ApiErrorCode, jsonFail } from '@/lib/server/api-response';

export type BodyWithSettings<T> = {
  settings: ChatSettingsPayload;
  body: T;
};

/**
 * 从请求 JSON 取出顶层 settings，剩余字段原样返回供后续 parse。
 */
export function splitChatSettings(
  json: unknown,
): { ok: true; settings: ChatSettingsPayload; rest: unknown } | { ok: false; message: string } {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, message: '请求体无效' };
  }
  const record = json as Record<string, unknown>;
  const parsed = parseChatSettingsPayload(record.settings);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  const { settings: _omit, ...rest } = record;
  return { ok: true, settings: parsed.settings, rest };
}

/** settings 校验失败时的统一 400 信封 */
export function settingsFailResponse(message: string): Response {
  return jsonFail(ApiErrorCode.INVALID_PARAMS, message, 400);
}

/** 在对话 settings ALS 内执行 */
export function withStudioChatSettings<T>(settings: ChatSettingsPayload, fn: () => T): T {
  return runWithChatSettings(settings, fn);
}
