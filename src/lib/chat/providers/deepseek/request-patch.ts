import { DEEPSEEK_UNSUPPORTED_INCLUDES } from './constants';

export type DeepSeekRequestBody = {
  include?: string[];
  /** 如 DeepSeek 报 reasoning.summary 未知，扩展此类型后剥离 */
  reasoning?: { summary?: string; [k: string]: unknown };
};

/**
 * 修补出站请求体以兼容 DeepSeek Responses API；有改动时返回 true。
 * 目前仅剥离 OpenAI 专有 include（web_search_call.action.sources / reasoning.encrypted_content），
 * 无需 Ark 的 input item phase/type/status 修正或 SSE 归一化。
 */
export function patchDeepSeekRequestBody(body: DeepSeekRequestBody): boolean {
  let patched = false;

  // 修复：SDK 自动注入的 OpenAI include，DeepSeek 报 InvalidParameter unknown type（同 Ark #13144）
  if (Array.isArray(body.include)) {
    const nextInclude = body.include.filter((item) => !DEEPSEEK_UNSUPPORTED_INCLUDES.has(item));

    if (nextInclude.length === 0) {
      delete body.include;
    } else if (nextInclude.length !== body.include.length) {
      body.include = nextInclude;
    }

    patched = true;
  }

  return patched;
}
