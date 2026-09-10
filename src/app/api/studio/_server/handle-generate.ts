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
import { buildGeneratePlan } from './generate-plan';
import { generateStudioImage } from './generate-one';
import { parseGenerateBody } from './parse-generate-request';
import { createPushStreamResponse, encodeNdjsonLine, NDJSON_STREAM_HEADERS } from './stream-encode';

/**
 * POST /api/studio/generate：按 kind 出产品精修、多视角、主视觉、主图、模特或视觉设计图，NDJSON 推送每张 data URL。
 * 产品精修按上传原图一对一出图，忽略表单生成数量。
 *
 * 批次展开交由 `buildGeneratePlan`，与电商后台作业（`job-produce-generate`）共用同一份顺序定义。
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

  if (body.kind === 'mainImage' || body.kind === 'detailImage') {
    if (body.productViewImages.length === 0) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
    }
  }

  const plan = buildGeneratePlan(body);
  const slotIds = body.slotIds ?? [];
  // 槽位数与出图清单不一致时事件将无处投递（图会静默丢失），直接拒绝而不是照常出图
  if (slotIds.length !== plan.length) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }
  const slotIdAt = (index: number) => slotIds[index] ?? '';

  return createPushStreamResponse(NDJSON_STREAM_HEADERS, async (write) => {
    const send = (event: StudioGenerateImageEvent) => write(encodeNdjsonLine(event));
    try {
      for (const item of plan) {
        if (req.signal.aborted) return;
        const result = await generateStudioImage({
          prompt: item.prompt,
          model: body.model,
          aspectRatio: body.aspectRatio,
          clarity: body.clarity,
          quality: body.quality,
          referenceImageDataUrls: item.referenceImageDataUrls,
          abortSignal: req.signal,
        });
        if (req.signal.aborted) return;
        if (result.ok) {
          await send({ slotId: slotIdAt(item.index), url: result.url });
        } else {
          await send({ slotId: slotIdAt(item.index), error: result.error });
        }
      }
    } catch (err) {
      if (req.signal.aborted) return;
      console.error('[studio/generate]', err);
      try {
        await send({ slotId: slotIdAt(0), error: GENERATE_FAILED });
      } catch {
        /* 流已关闭 */
      }
    }
  });
}
