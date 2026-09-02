import 'server-only';

import type { EcommerceGenerateImageEvent } from '@/app/api/ecommerce/_shared/types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { GENERATE_FAILED, INVALID_FORM, INVALID_JSON, MISSING_PRODUCT_IMAGE } from './constants';
import { generateStudioImage } from './generate-one';
import { parseGenerateBody } from './parse-request';
import { createPushStreamResponse, encodeNdjsonLine, NDJSON_STREAM_HEADERS } from './stream-encode';

/**
 * POST /api/ecommerce/generate：按 slots 逐张 i2i，NDJSON 推送每张 data URL。
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

  const productDataUrls = body.images.map((image) => image.dataUrl);
  if (productDataUrls.length === 0) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
  }

  return createPushStreamResponse(NDJSON_STREAM_HEADERS, async (write) => {
    const send = (event: EcommerceGenerateImageEvent) => write(encodeNdjsonLine(event));
    try {
      for (const slot of body.slots) {
        if (req.signal.aborted) return;
        const result = await generateStudioImage({
          prompt: slot.prompt,
          model: body.model,
          aspectRatio: body.aspectRatio,
          clarity: body.clarity,
          quality: body.quality,
          productDataUrls,
          abortSignal: req.signal,
        });
        if (req.signal.aborted) return;
        if (result.ok) {
          await send({ index: slot.index, url: result.url });
        } else {
          await send({ index: slot.index, error: result.error });
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
