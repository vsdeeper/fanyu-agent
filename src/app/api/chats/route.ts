import { handleCreateChat, handleListChats } from '@/features/chat/server/handle-chats';

export const runtime = 'nodejs';

export async function GET() {
  return handleListChats();
}

export async function POST() {
  return handleCreateChat();
}
