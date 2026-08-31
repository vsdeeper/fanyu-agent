import { handleCreateChat, handleListChats } from '@/app/api/chats/_server/handle-chats';

export const runtime = 'nodejs';

export async function GET() {
  return handleListChats();
}

export async function POST() {
  return handleCreateChat();
}
