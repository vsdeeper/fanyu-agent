import {
  ARK_UNSUPPORTED_INCLUDES,
  ARK_VISION_MAX_PIXELS,
  ARK_VISION_MIN_PIXELS,
} from './constants';

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

type ArkInputImagePart = {
  type?: string;
  detail?: string;
  image_url?: string;
  file_id?: string;
  image_pixel_limit?: { max_pixels?: number; min_pixels?: number };
};

/**
 * 识图等高精度出站：SDK 仅认 auto/low/high/original，方舟另有 xhigh。
 * 将 detail=high 升为 xhigh，并写入平台允许的最大像素上限，减少服务端等比例缩小。
 */
function upgradeHighDetailInputImages(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  let patched = false;
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    const image = part as ArkInputImagePart;
    if (image.type !== 'input_image') continue;
    if (image.detail !== 'high') continue;

    image.detail = 'xhigh';
    image.image_pixel_limit = {
      max_pixels: ARK_VISION_MAX_PIXELS,
      min_pixels: ARK_VISION_MIN_PIXELS,
    };
    patched = true;
  }
  return patched;
}

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
        content?: unknown;
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

      if (upgradeHighDetailInputImages(next.content)) {
        patched = true;
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
