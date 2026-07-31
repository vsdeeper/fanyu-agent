import { handleChatPost } from '@/lib/chat/handle-post';
import { parseChatPostBody } from '@/lib/chat/parse-request';
import { parseUserLocation } from '@/lib/geo/parse-request';
import { ApiErrorCode, jsonFail } from '@/lib/shared/api-response';

// globalThis.AI_SDK_LOG_WARNINGS = false;

export const maxDuration = 120;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await parseChatPostBody(req);

    if (!body.id || typeof body.id !== 'string') {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
    }

    const userLocation = parseUserLocation(body.userLocation);

    return handleChatPost({
      body,
      userLocation,
      abortSignal: req.signal,
    });
  } catch {
    // 修复：勿把 err.message 写入响应，避免英文 provider/内部错误暴露给客户端
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
