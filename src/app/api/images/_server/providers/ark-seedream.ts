import { requireEnv } from '@/lib/shared/server/env';
import { buildImagePrompt, decodeBase64Image, downloadImage, sniffImageMime } from '../image-utils';
import type { ImageProvider } from '../types';
import { getImageSpec, resolveOutboundImageSize } from '../image-spec';

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

    // 按模型声明解析：Seedream 上游不支持 *K 档位，须先转基准 WxH，再按比例 reshape。
    // 避免「只给比例」时被 minPixels 拉到最小、或 K 档位直传非 WxH 导致默认不生效。
    const outboundSize = resolveOutboundImageSize(req.size, req.aspectRatio, spec);

    const body: Record<string, unknown> = {
      model: req.modelId,
      prompt: buildImagePrompt(req.prompt, req.transparent),
      response_format: 'url',
      size: outboundSize,
      watermark: false,
    };
    // Seedream 4.5 不支持 `output_format`（png/jpeg），传则 400 InvalidParameter；
    // 透明背景仍经 buildImagePrompt 的 prompt 后缀表达。缺省 spec.supportsOutputFormat 视为 true（5-0-lite 等旧模型保持原行为）。
    if (spec.supportsOutputFormat !== false) {
      body.output_format = req.transparent ? 'png' : 'jpeg';
    }

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
      console.error('[ark-seedream] upstream error', {
        modelId: req.modelId,
        status: response.status,
        size: outboundSize,
        aspectRatio: req.aspectRatio,
        payload,
      });
      throw new Error('方舟生图服务暂不可用');
    }

    const items = payload.data ?? [];
    if (items.length === 0) {
      console.error('[ark-seedream] 未返回图片', {
        modelId: req.modelId,
        status: response.status,
        size: outboundSize,
        aspectRatio: req.aspectRatio,
        payload,
      });
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
