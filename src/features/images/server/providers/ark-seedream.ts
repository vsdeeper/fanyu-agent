import { requireEnv } from '@/lib/shared/server/env';
import { buildImagePrompt, decodeBase64Image, downloadImage, sniffImageMime } from '../image-utils';
import type { ImageProvider } from '../../types';
import {
  aspectRatioToSize,
  getImageSpec,
  IMAGE_ASPECT_RATIO_AUTO,
  normalizeImageSize,
} from '../../image-spec';

type ArkImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

export const arkSeedreamProvider: ImageProvider = {
  id: 'ark',
  async generate(req) {
    const apiKey = requireEnv('ARK_API_KEY');
    const baseURL = requireEnv('ARK_BASE_URL').replace(/\/$/, '');
    const spec = getImageSpec(req.modelId);

    // 修复：归一化 size，避免 `1024x1024` 等低于最小像素限制的值透传给上游导致 400
    const size = normalizeImageSize(req.size, spec);
    if (req.size && req.size.trim() !== size) {
      console.warn(`[ark-seedream] size 已归一化: "${req.size}" -> "${size}"`);
    }

    // 方舟仅接受 WIDTHxHEIGHT / 档位（不接受比例串），比例须换算成像素宽高
    const ratio =
      req.aspectRatio && req.aspectRatio !== IMAGE_ASPECT_RATIO_AUTO ? req.aspectRatio : undefined;
    const ratioSize = ratio ? aspectRatioToSize(ratio, spec) : undefined;

    // 修复：用户显式给 size（档位/像素）时优先采纳，避免被 ratioSize 按 minPixels 换算降到更低面积；
    // 仅未给 size 时才用比例换算的像素宽高；两者同时给会丢弃比例，留日志便于排查。
    const hasExplicitSize = !!req.size?.trim();
    const outboundSize = hasExplicitSize ? size : (ratioSize ?? size);
    if (hasExplicitSize && ratioSize) {
      console.warn(
        `[ark-seedream] 同时指定 size 与 aspectRatio，优先 size="${size}"，忽略比例换算 "${ratioSize}"`,
      );
    }

    const body: Record<string, unknown> = {
      model: req.modelId,
      prompt: buildImagePrompt(req.prompt, req.transparent),
      response_format: 'url',
      output_format: req.transparent ? 'png' : 'jpeg',
      size: outboundSize,
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
