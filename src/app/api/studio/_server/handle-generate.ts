import 'server-only';

import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import {
  GENERATE_FAILED,
  INVALID_FORM,
  INVALID_JSON,
  MISSING_ANALYSIS,
  MISSING_PRODUCT_IMAGE,
} from './constants';
import {
  buildDesignPrompt,
  buildMainImagePrompt,
  buildProductModelPrompt,
  buildProductMultiviewPrompt,
  buildProductRefinePrompt,
  buildProductViewPrompt,
  buildVisualPrompt,
} from './generate-instructions';
import { generateStudioImage } from './generate-one';
import { parseGenerateBody } from './parse-generate-request';
import { createPushStreamResponse, encodeNdjsonLine, NDJSON_STREAM_HEADERS } from './stream-encode';

/**
 * POST /api/studio/generate：按 kind 出产品精修、多视角、主视觉、主图、模特或视觉设计图，NDJSON 推送每张 data URL。
 */
export async function handleStudioGenerate(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseGenerateBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  if (
    body.kind === 'productRefine' ||
    body.kind === 'productView' ||
    body.kind === 'productModel'
  ) {
    if (body.images.length === 0) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
    }
  }

  if (body.kind === 'visual') {
    if (body.productViewImages.length === 0) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
    }
    if (!body.analysisText.trim()) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_ANALYSIS, 400);
    }
  }

  if (body.kind === 'mainImage') {
    if (body.productViewImages.length === 0) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
    }
  }

  const count = body.count;
  let prompt = '';
  let referenceImageDataUrls: string[];
  if (body.kind === 'productRefine') {
    prompt = buildProductRefinePrompt(body.refineRequirement);
    referenceImageDataUrls = body.images.map((image) => image.dataUrl);
  } else if (body.kind === 'productMultiview') {
    prompt = buildProductMultiviewPrompt(body.multiviewRequirement);
    referenceImageDataUrls = [body.refinedImageDataUrl];
  } else if (body.kind === 'productView') {
    prompt = buildProductViewPrompt();
    referenceImageDataUrls = body.images.map((image) => image.dataUrl);
  } else if (body.kind === 'productModel') {
    prompt = buildProductModelPrompt(
      body.viewRequirement,
      body.images.length,
      (body.modelImages?.length ?? 0) > 0,
    );
    referenceImageDataUrls = [
      ...body.images.map((image) => image.dataUrl),
      ...(body.modelImages?.map((image) => image.dataUrl) ?? []),
    ];
  } else if (body.kind === 'visual') {
    prompt = buildVisualPrompt(body.analysisText);
    referenceImageDataUrls = body.productViewImages.map((image) => image.dataUrl);
  } else if (body.kind === 'mainImage') {
    referenceImageDataUrls = body.productViewImages.map((image) => image.dataUrl);
  } else {
    prompt = buildDesignPrompt(body.taskType, body.analysisText, body.includeModel);
    referenceImageDataUrls = [
      ...body.productViewImages.map((image) => image.dataUrl),
      body.visualDataUrl,
      ...(body.modelImages?.map((image) => image.dataUrl) ?? []),
    ];
  }

  return createPushStreamResponse(NDJSON_STREAM_HEADERS, async (write) => {
    const send = (event: StudioGenerateImageEvent) => write(encodeNdjsonLine(event));
    try {
      if (body.kind === 'mainImage') {
        let index = 0;
        for (const item of body.requirements) {
          const themePrompt = buildMainImagePrompt(item.requirement, body.analysisText);
          for (let i = 0; i < count; i++) {
            if (req.signal.aborted) return;
            const result = await generateStudioImage({
              prompt: themePrompt,
              model: body.model,
              aspectRatio: body.aspectRatio,
              clarity: body.clarity,
              quality: body.quality,
              referenceImageDataUrls,
              abortSignal: req.signal,
            });
            if (req.signal.aborted) return;
            if (result.ok) {
              await send({ index, url: result.url });
            } else {
              await send({ index, error: result.error });
            }
            index += 1;
          }
        }
        return;
      }

      for (let index = 0; index < count; index++) {
        if (req.signal.aborted) return;
        const result = await generateStudioImage({
          prompt,
          model: body.model,
          aspectRatio: body.aspectRatio,
          clarity: body.clarity,
          quality: body.quality,
          referenceImageDataUrls,
          abortSignal: req.signal,
        });
        if (req.signal.aborted) return;
        if (result.ok) {
          await send({ index, url: result.url });
        } else {
          await send({ index, error: result.error });
        }
      }
    } catch (err) {
      if (req.signal.aborted) return;
      console.error('[studio/generate]', err);
      try {
        await send({ index: 0, error: GENERATE_FAILED });
      } catch {
        /* 流已关闭 */
      }
    }
  });
}
