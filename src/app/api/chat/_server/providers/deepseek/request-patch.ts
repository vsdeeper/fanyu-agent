import { DEEPSEEK_IMAGE_DETAIL, DEEPSEEK_UNSUPPORTED_INCLUDES } from './constants';
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

type DeepSeekInputImagePart = {
  type?: string;
  detail?: string;
  image_url?: string;
  file_id?: string;
};

/**
 * 将 input_image 的 detail 钉为 original：覆盖 SDK 省略（官方 auto）与 analyze_image 的 high。
 */
function applyOriginalDetailToInputImages(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  let patched = false;
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    const image = part as DeepSeekInputImagePart;
    if (image.type !== 'input_image') continue;
    if (image.detail === DEEPSEEK_IMAGE_DETAIL) continue;
    image.detail = DEEPSEEK_IMAGE_DETAIL;
    patched = true;
  }
  return patched;
}

/**
 * 修补出站请求体以兼容 DeepSeek Responses API；有改动时返回 true。
 * 剥离 OpenAI 专有 include、识图 detail 钉 original，并把思考内容还原为 reasoning_text item。
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

  if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (applyOriginalDetailToInputImages(item?.content)) {
        patched = true;
      }
    }
  }

  if (applyReasoningPassback(body)) {
    patched = true;
  }

  return patched;
}
