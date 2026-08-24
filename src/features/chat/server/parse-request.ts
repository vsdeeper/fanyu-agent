import type { UIMessage } from 'ai';

export type ChatPostBody = {
  id: string;
  message?: UIMessage;
  userLocation?: unknown;
};

export async function parseChatPostBody(req: Request): Promise<ChatPostBody> {
  return (await req.json()) as ChatPostBody;
}
