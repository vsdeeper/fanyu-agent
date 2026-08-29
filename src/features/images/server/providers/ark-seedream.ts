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

    // 改图用本地 data URL/base64，勿依赖方舟返回的临时 CDN URL（易过期）
    const refs = req.mode === 'edit' ? (req.referenceImageDataUrls ?? []) : [];
    // Seedream 多参考能力未验证：多张先按数组试发，上游 400 拒绝数组时降级仅首图重试，其余靠 prompt 描述。
    // 单张/无则保持标量 body.image，行为不回归。
    if (refs.length === 1) {
      body.image = refs[0];
    } else if (refs.length > 1) {
      body.image = refs;
    }

    const doFetch = async (candidateBody: Record<string, unknown>) => {
      const signal = req.abortSignal
        ? AbortSignal.any([req.abortSignal, AbortSignal.timeout(180_000)])
        : AbortSignal.timeout(180_000);
      const response = await fetch(`${baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateBody),
        signal,
      });
      // 错误体可能非 JSON（如 502 网关 HTML）；parse 失败降级为空，勿让上游文案抛穿降级分支
      let payload: ArkImageResponse = {};
      try {
        payload = (await response.json()) as ArkImageResponse;
      } catch {
        payload = {};
      }
      return { response, payload };
    };

    let { response, payload } = await doFetch(body);

    // 仅当上游明确以 400（参数无效，含「不支持数组」类）拒绝时才降级首图；5xx 属服务端瞬态，勿误降级掩盖真因。
    if (response.status === 400 && refs.length > 1) {
      console.warn('[ark-seedream] 多参考被上游拒绝(400)，降级仅首图', payload);
      if (req.abortSignal?.aborted) {
        throw new Error('已中断');
      }
      body.image = refs[0];
      ({ response, payload } = await doFetch(body));
    }

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
