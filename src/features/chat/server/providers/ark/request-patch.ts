import { ARK_UNSUPPORTED_INCLUDES } from './constants';

export type ArkRequestBody = {
  instructions?: string;
  input?: Array<{
    role?: string;
    type?: string;
    status?: string;
    phase?: unknown;
    partial?: boolean;
    content?: unknown;
    summary?: unknown;
  }>;
  include?: string[];
};

/** 修补出站请求体以兼容方舟 Responses API；有改动时返回 true */
export function patchArkRequestBody(body: ArkRequestBody): boolean {
  let patched = false;

  if (Array.isArray(body.input)) {
    body.input = body.input.map((item) => {
      if (!item || typeof item !== 'object') return item;

      const next = { ...item } as {
        role?: string;
        type?: string;
        status?: string;
        partial?: boolean;
        phase?: unknown;
      };

      // 修复：Ark 不认 input item 的 phase 字段（phase 仅存在于 output item；
      // @ai-sdk/openai 从历史 providerMetadata 回灌到 input 导致 Ark 报 unknown field "phase"）
      delete next.phase;

      // 修复：有 role 无 type 时方舟报 MissingParameter input.type
      if (item.role && item.type == null) {
        next.type = 'message';
      }

      if (item.role === 'assistant' && item.status == null) {
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
