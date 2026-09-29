import type { UIMessage } from 'ai';

import {
  parseChatSettingsPayload,
  type ChatSettingsPayload,
} from '@/app/api/chat/_shared/chat-settings';

export type ChatPostBody = {
  id: string;
  message?: UIMessage;
  userLocation?: unknown;
  settings: ChatSettingsPayload;
};

export async function parseChatPostBody(req: Request): Promise<ChatPostBody | { error: string }> {
  const raw = (await req.json()) as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id : '';
  const parsed = parseChatSettingsPayload(raw.settings);
  if (!parsed.ok) {
    return { error: parsed.message };
  }
  return {
    id,
    message: raw.message as UIMessage | undefined,
    userLocation: raw.userLocation,
    settings: parsed.settings,
  };
}
