import { deleteChat, loadChat } from '@/features/chat/server/store';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';

export async function handleGetChat(id: string): Promise<Response> {
  try {
    const chat = await loadChat(id);
    return jsonOk(chat);
  } catch {
    return jsonFail(ApiErrorCode.CHAT_NOT_FOUND, '会话不存在', 404);
  }
}

export async function handleDeleteChat(id: string): Promise<Response> {
  try {
    await deleteChat(id);
    return jsonOk(null);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '删除失败，请稍后重试', 500);
  }
}
