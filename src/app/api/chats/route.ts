import { createChat, listChats } from '@/lib/chat-store';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
  const chats = await listChats();
  return jsonOk({ chats });
}

export async function POST() {
  try {
    const id = await createChat();
    return jsonOk({ id });
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '创建会话失败，请稍后重试', 500);
  }
}
