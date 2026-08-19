import { DEEPSEEK_UNSUPPORTED_INCLUDES } from './constants';
import { applyReasoningPassback } from './reasoning-passback';

export type DeepSeekInputItem = {
  type?: string;
  role?: string;
  content?: unknown;
  summary?: unknown;
  encrypted_content?: unknown;
  [key: string]: unknown;
};

export type DeepSeekRequestBody = {
  include?: string[];
  /** 如 DeepSeek 报 reasoning.summary 未知，扩展此类型后剥离 */
  reasoning?: { summary?: string; [k: string]: unknown };
  instructions?: string;
  input?: DeepSeekInputItem[];
};

/**
 * 修补出站请求体以兼容 DeepSeek Responses API；有改动时返回 true。
 * 剥离 OpenAI 专有 include，并把思考内容还原为 reasoning_text item。
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

  if (applyReasoningPassback(body)) {
    patched = true;
  }

  return patched;
}
