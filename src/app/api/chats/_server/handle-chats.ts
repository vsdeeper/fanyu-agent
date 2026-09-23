import { createChat, queryChats } from '@/app/api/chats/_server/store';
import { parseChatListQuery } from '@/app/api/chats/_server/parse-list-query';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';

/** 对话管理列表：按标题与创建日期筛选，全量返回。 */
export async function handleListChats(req: Request): Promise<Response> {
  try {
    const filters = parseChatListQuery(req.url);
    const items = await queryChats(filters);
    return jsonOk({ items });
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '查询参数无效', 400);
  }
}

export async function handleCreateChat(): Promise<Response> {
  try {
    const id = await createChat();
    return jsonOk({ id });
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '创建会话失败，请稍后重试', 500);
  }
}
