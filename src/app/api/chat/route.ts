import { handleChatApiPost } from '@/app/api/chat/_server/handle-post';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

// globalThis.AI_SDK_LOG_WARNINGS = false;

// 聊天流式接口可能链式触发生图 tool 等多轮耗时操作，工具循环已放宽到 40 步，
// 单轮往返可能远超 120s，故提到 600s 覆盖多图设计流。
export const maxDuration = 600;

// 会话走 Node 运行时：依赖 better-sqlite3 + 本地文件落盘，Edge 环境无法运行
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    return handleChatApiPost(req);
  } catch {
    // 修复：勿把 err.message 写入响应，避免英文 provider/内部错误暴露给客户端
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
