import 'server-only';

import {
  getImageSpec,
  isValidImageSize,
  resolveImageQuality,
} from '@/app/api/images/_server/image-spec';
import { resolveExplicitImageModelId } from '@/app/api/images/_server/registry';
import { generateImageViaRouter } from '@/app/api/images/_server/router';

export type GenerateOneResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * 把生图字节编成 data URL，供工作台前端直接展示，不写 image_assets。
 */
function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * 单张生图（有参考图则 i2i，否则 t2i），结果以 data URL 返回。不经过 chat generate_image tool，不落盘。
 */
export async function generateStudioImage(input: {
  prompt: string;
  model: string;
  aspectRatio: string;
  clarity: string;
  quality: string;
  referenceImageDataUrls?: string[];
  abortSignal?: AbortSignal;
}): Promise<GenerateOneResult> {
  if (input.abortSignal?.aborted) {
    return { ok: false, error: '已取消' };
  }

  try {
    const modelId = resolveExplicitImageModelId(input.model);
    if (!modelId) {
      return { ok: false, error: '不支持的生图模型' };
    }
    const spec = getImageSpec(modelId);
    const resolvedSize =
      input.clarity && isValidImageSize(input.clarity, spec)
        ? input.clarity.trim()
        : spec.size.default;
    const resolvedQuality = resolveImageQuality(input.quality, spec);
    const refs = input.referenceImageDataUrls?.filter(Boolean) ?? [];
    const mode = refs.length > 0 ? 'edit' : 'generate';
    console.info('[ecommerce/generate] image-request', {
      requestedModelId: input.model,
      modelId,
      mode,
      clarity: input.clarity,
      resolvedSize,
      aspectRatio: input.aspectRatio,
      quality: resolvedQuality ?? '默认',
      refs: refs.length,
    });

    const result = await generateImageViaRouter({
      modelId,
      prompt: input.prompt,
      mode,
      ...(refs.length > 0 ? { referenceImageDataUrls: refs } : {}),
      size: resolvedSize,
      quality: resolvedQuality,
      aspectRatio: input.aspectRatio,
      abortSignal: input.abortSignal,
    });

    if (input.abortSignal?.aborted) {
      return { ok: false, error: '已取消' };
    }

    const first = result.images[0];
    if (!first) {
      console.error('[ecommerce/generate] empty images', { modelId });
      return { ok: false, error: '生图服务暂不可用' };
    }

    return { ok: true, url: bytesToDataUrl(first.bytes, first.mimeType) };
  } catch (err) {
    if (input.abortSignal?.aborted) {
      return { ok: false, error: '已取消' };
    }
    console.error('[ecommerce/generate] generateStudioImage', err);
    return { ok: false, error: '生图服务暂不可用' };
  }
}
