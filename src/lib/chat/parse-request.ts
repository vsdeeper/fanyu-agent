import type { UIMessage } from 'ai';

export type ChatTrigger = 'submit-message' | 'continue-message';

export type ChatPostBody = {
  id: string;
  message?: UIMessage;
  trigger?: ChatTrigger;
  messageId?: string;
  webSearch?: boolean;
  userLocation?: unknown;
};

export async function parseChatPostBody(req: Request): Promise<ChatPostBody> {
  return (await req.json()) as ChatPostBody;
}
