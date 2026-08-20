import { requireEnv } from '@/lib/shared/env';
import type { ImageProvider } from '../types';
import { getSizeSpec, normalizeImageSize } from '../size';

type ArkImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

const TRANSPARENT_PROMPT_SUFFIX = '透明背景，alpha 通道，无底色、无棋盘格、无阴影底板';

/**
 * 透明出图时在出站 prompt 末尾追加 alpha 约束；落盘仍用调用方原始 prompt。
 */
function buildArkPrompt(prompt: string, transparent?: boolean): string {
  if (!transparent) return prompt;
  return `${prompt}\n${TRANSPARENT_PROMPT_SUFFIX}`;
}

/**
 * 按文件头识别图片 MIME，避免上游 Content-Type 缺失或 b64 时误标为 jpeg。
 */
function sniffImageMime(bytes: Uint8Array, fallback = 'image/jpeg'): string {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return fallback;
}

function decodeBase64Image(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载生图结果失败: HTTP ${response.status}`);
  }
  const headerMime = response.headers.get('content-type')?.split(';')[0]?.trim();
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return { bytes, mimeType: sniffImageMime(bytes, headerMime || 'image/jpeg') };
}

export const arkSeedreamProvider: ImageProvider = {
  id: 'ark',
  async generate(req) {
    const apiKey = requireEnv('ARK_API_KEY');
    const baseURL = requireEnv('ARK_BASE_URL').replace(/\/$/, '');

    // 修复：归一化 size，避免 `1024x1024` 等低于最小像素限制的值透传给上游导致 400
    const size = normalizeImageSize(req.size, getSizeSpec(req.modelId));
    if (req.size && req.size.trim() !== size) {
      console.warn(`[ark-seedream] size 已归一化: "${req.size}" -> "${size}"`);
    }

    const body: Record<string, unknown> = {
      model: req.modelId,
      prompt: buildArkPrompt(req.prompt, req.transparent),
      response_format: 'url',
      output_format: req.transparent ? 'png' : 'jpeg',
      size,
      watermark: false,
    };

    // 修复：改图用本地 data URL/base64，勿依赖方舟返回的临时 CDN URL（易过期）
    if (req.mode === 'edit' && req.referenceImageDataUrls?.length) {
      const ref = req.referenceImageDataUrls[0];
      if (ref.startsWith('data:')) {
        body.image = ref;
      } else {
        body.image = ref;
      }
    }

    const response = await fetch(`${baseURL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as ArkImageResponse;
    if (!response.ok) {
      console.error('[ark-seedream] upstream error', response.status, payload);
      throw new Error('方舟生图服务暂不可用');
    }

    const items = payload.data ?? [];
    if (items.length === 0) {
      throw new Error('方舟生图未返回图片');
    }

    const images = await Promise.all(
      items.map(async (item) => {
        if (item.b64_json) {
          const bytes = decodeBase64Image(item.b64_json);
          return { bytes, mimeType: sniffImageMime(bytes) };
        }
        if (item.url) {
          return downloadImage(item.url);
        }
        throw new Error('方舟生图结果格式无效');
      }),
    );

    return { images };
  },
};
