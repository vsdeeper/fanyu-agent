import { ARK_UNSUPPORTED_INCLUDES } from './constants';

export type ArkRequestBody = {
  input?: Array<{ role?: string; type?: string; status?: string }>;
  include?: string[];
};

/** 修补出站请求体以兼容方舟 Responses API；有改动时返回 true */
export function patchArkRequestBody(body: ArkRequestBody): boolean {
  let patched = false;

  if (Array.isArray(body.input)) {
    const lastInputIndex = body.input.length - 1;

    body.input = body.input.map((item, index) => {
      if (!item || typeof item !== 'object') return item;

      const next = { ...item } as {
        role?: string;
        type?: string;
        status?: string;
        partial?: boolean;
      };

      // 修复：有 role 无 type 时方舟报 MissingParameter input.type
      if (item.role && item.type == null) {
        next.type = 'message';
      }

      const isLast = index === lastInputIndex;

      // 修复：断点续写时末条 assistant/reasoning 须 partial+incomplete；勿标 completed（方舟报 MissingParameter partial）
      if (isLast && (next.role === 'assistant' || next.type === 'reasoning')) {
        if (next.status == null || next.status === 'completed') {
          next.partial = true;
          next.status = 'incomplete';
        }
      } else if (item.role === 'assistant' && item.status == null) {
        // 修复：回放历史 assistant 缺 status 时方舟报 MissingParameter input.status
        next.status = 'completed';
      }

      return next;
    });

    patched = true;
  }

  // 修复：SDK 自动注入的 OpenAI include，方舟报 InvalidParameter unknown type
  if (Array.isArray(body.include)) {
    const nextInclude = body.include.filter((item) => !ARK_UNSUPPORTED_INCLUDES.has(item));

    if (nextInclude.length === 0) {
      delete body.include;
    } else {
      body.include = nextInclude;
    }

    patched = true;
  }

  return patched;
}
