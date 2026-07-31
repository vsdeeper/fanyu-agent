import type { UIMessage } from 'ai';

import type { UserLocation } from '@/lib/shared/user-location';

export type ChatTrigger = 'submit-message' | 'continue-message';

export type ChatPostBody = {
  id: string;
  message?: UIMessage;
  trigger?: ChatTrigger;
  messageId?: string;
  webSearch?: boolean;
  userLocation?: unknown;
};

/** 仅接受 approximate + 已知可选字符串字段，忽略非法结构 */
export function parseUserLocation(value: unknown): UserLocation | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  if (raw.type !== 'approximate') return undefined;

  const pick = (key: string): string | undefined => {
    const v = raw[key];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };

  return {
    type: 'approximate',
    ...(pick('country') ? { country: pick('country') } : {}),
    ...(pick('city') ? { city: pick('city') } : {}),
    ...(pick('region') ? { region: pick('region') } : {}),
    ...(pick('timezone') ? { timezone: pick('timezone') } : {}),
  };
}

export async function parseChatPostBody(req: Request): Promise<ChatPostBody> {
  return (await req.json()) as ChatPostBody;
}
