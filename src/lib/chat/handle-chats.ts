import { createChat, listChats } from '@/lib/chat/store';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/api-response';

export async function handleListChats(): Promise<Response> {
  const chats = await listChats();
  return jsonOk({ chats });
}

export async function handleCreateChat(): Promise<Response> {
  try {
    const id = await createChat();
    return jsonOk({ id });
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '创建会话失败，请稍后重试', 500);
  }
}
