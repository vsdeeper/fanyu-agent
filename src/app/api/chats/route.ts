import { handleCreateChat, handleListChats } from '@/app/api/chats/_server/handle-chats';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  return handleListChats(req);
}

export async function POST() {
  return handleCreateChat();
}
