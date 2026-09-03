import 'server-only';

import type { EcommerceGenerateImageEvent } from '@/app/api/ecommerce/_shared/types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import {
  GENERATE_FAILED,
  INVALID_FORM,
  INVALID_JSON,
  MISSING_ANALYSIS,
  MISSING_PRODUCT_IMAGE,
  MISSING_VISUAL,
  MODEL_GENERATE_COUNT,
} from './constants';
import { buildModelPrompt, buildVisualPrompt } from './generate-instructions';
import { generateStudioImage } from './generate-one';
import { parseGenerateBody } from './parse-request';
import { createPushStreamResponse, encodeNdjsonLine, NDJSON_STREAM_HEADERS } from './stream-encode';

/**
 * POST /api/ecommerce/generate：按 kind 出主视觉或模特图，NDJSON 推送每张 data URL。
 */
export async function handleEcommerceGenerate(req: Request): Promise<Response> {
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

  if (body.kind === 'visual') {
    if (body.images.length === 0) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
    }
    if (!body.analysisText.trim()) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_ANALYSIS, 400);
    }
  }

  if (body.kind === 'model' && !body.visualDataUrl.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_VISUAL, 400);
  }

  const count = body.kind === 'visual' ? body.count : MODEL_GENERATE_COUNT;
  const hasPortrait = body.kind === 'model' && (body.modelImages?.length ?? 0) > 0;
  const prompt =
    body.kind === 'visual'
      ? buildVisualPrompt(body.analysisText)
      : buildModelPrompt(body.modelRequirement, hasPortrait);
  const referenceImageDataUrls =
    body.kind === 'visual'
      ? body.images.map((image) => image.dataUrl)
      : [
          body.visualDataUrl,
          ...(body.kind === 'model' ? (body.modelImages?.map((image) => image.dataUrl) ?? []) : []),
        ];

  return createPushStreamResponse(NDJSON_STREAM_HEADERS, async (write) => {
    const send = (event: EcommerceGenerateImageEvent) => write(encodeNdjsonLine(event));
    try {
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
      console.error('[ecommerce/generate]', err);
      try {
        await send({ index: 0, error: GENERATE_FAILED });
      } catch {
        /* 流已关闭 */
      }
    }
  });
}
