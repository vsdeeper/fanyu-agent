import { handleChatApiPost } from '@/features/chat/server/handle-post';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

// globalThis.AI_SDK_LOG_WARNINGS = false;

export const maxDuration = 120;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    return handleChatApiPost(req);
  } catch {
    // 修复：勿把 err.message 写入响应，避免英文 provider/内部错误暴露给客户端
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
