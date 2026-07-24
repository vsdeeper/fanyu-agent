import { createChat, listChats } from '@/lib/chat-store';

export const runtime = 'nodejs';

export async function GET() {
  const chats = await listChats();
  return Response.json({ chats });
}

export async function POST() {
  const id = await createChat();
  return Response.json({ id });
}
