import 'server-only';

import {
  getImageSpec,
  isValidImageSize,
  resolveImageQuality,
} from '@/app/api/images/_server/image-spec';
import { generateImageViaRouter, resolveImageModelId } from '@/app/api/images/_server/router';
import { PRODUCT_EDIT_PROMPT_GUARD } from './constants';

export type GenerateOneResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * 把生图字节编成 data URL，供工作台前端直接展示，不写 image_assets。
 */
function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * 按单张 slot 做产品图 i2i，结果以 data URL 返回。不经过 chat generate_image tool，不落盘。
 */
export async function generateStudioImage(input: {
  prompt: string;
  model: string;
  aspectRatio: string;
  clarity: string;
  quality: string;
  productDataUrls: string[];
  abortSignal?: AbortSignal;
}): Promise<GenerateOneResult> {
  if (input.abortSignal?.aborted) {
    return { ok: false, error: '已取消' };
  }

  if (input.productDataUrls.length === 0) {
    return { ok: false, error: '缺少产品图' };
  }

  try {
    const modelId = resolveImageModelId({ requestedModelId: input.model });
    const spec = getImageSpec(modelId);
    const resolvedSize =
      input.clarity && isValidImageSize(input.clarity, spec)
        ? input.clarity.trim()
        : spec.size.default;
    const resolvedQuality = resolveImageQuality(input.quality, spec);
    const outboundPrompt = `${input.prompt}\n${PRODUCT_EDIT_PROMPT_GUARD}`;

    const result = await generateImageViaRouter({
      modelId,
      prompt: outboundPrompt,
      mode: 'edit',
      referenceImageDataUrls: input.productDataUrls,
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
