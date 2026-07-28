import { createChat, listChats } from '@/lib/chat-store';
import { jsonOk } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  const chats = await listChats();
  return jsonOk({ chats });
}

export async function POST() {
  const id = await createChat();
  return jsonOk({ id });
}
