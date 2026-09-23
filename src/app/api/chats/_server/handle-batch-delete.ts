import { deleteChats } from '@/app/api/chats/_server/store';
import { parseBatchDeleteRequest } from '@/app/api/chats/_server/parse-list-query';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';

/** 批量删除会话。 */
export async function handleBatchDeleteChats(req: Request): Promise<Response> {
  let ids: string[];
  try {
    const body = await req.json();
    ({ ids } = parseBatchDeleteRequest(body));
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '请选择要删除的对话', 400);
  }

  try {
    const deleted = await deleteChats(ids);
    return jsonOk({ deleted });
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '删除失败，请稍后重试', 500);
  }
}
