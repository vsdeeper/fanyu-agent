import { deleteChat, loadChat } from '@/lib/chat/store';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/api-response';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const chat = await loadChat(id);
    return jsonOk(chat);
  } catch {
    return jsonFail(ApiErrorCode.CHAT_NOT_FOUND, '会话不存在', 404);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteChat(id);
    return jsonOk(null);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '删除失败，请稍后重试', 500);
  }
}
