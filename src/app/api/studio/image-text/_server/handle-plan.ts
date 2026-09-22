import 'server-only';

import { streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { parseImageDataUrlToFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { IMAGE_TEXT_SSE_EVENT } from '../_shared/constants';
import type { ImageTextSseTextEvent } from '../_shared/types';
import {
  IMAGE_TEXT_PLAN_MAX_OUTPUT_TOKENS,
  MISSING_INPUT,
  PLAN_FAILED,
  PLAN_TRUNCATED,
} from './constants';
import { PLAN_INSTRUCTIONS } from './instructions';
import { parsePlanBody } from './parse-request';
import { buildPlanPrompt } from './prompt';

type SseSend = (event: string, data: unknown) => Promise<void>;

/**
 * POST /api/studio/image-text/plan：根据素材图和/或内容流式整理图文卡片正文。
 */
export async function handleImageTextPlan(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parsePlanBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_INPUT, 400);
  }

  const fileParts = body.materialDataUrls.map((url) => parseImageDataUrlToFilePart(url));
  if (fileParts.some((part) => !part)) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }
  const materialParts = fileParts.flatMap((part) => (part ? [part] : []));

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const provider = getChatProvider();
        const runtime = getChatProviderRuntimeFor(provider);
        const capabilities = runtime.getCapabilities();
        const openaiOptions = {
          ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
          ...runtime.getOpenAIOptions(),
        };
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: PLAN_INSTRUCTIONS,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: buildPlanPrompt(body) },
                ...(materialParts.length
                  ? [
                      {
                        type: 'text' as const,
                        text: '以下附件是【素材图】，提供主题、主体与画风参考，不要照搬其版面：',
                      },
                      ...materialParts,
                    ]
                  : []),
              ],
            },
          ],
          abortSignal: req.signal,
          maxOutputTokens: IMAGE_TEXT_PLAN_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        for await (const delta of result.textStream) {
          if (req.signal.aborted) return;
          if (!delta) continue;
          const payload: ImageTextSseTextEvent = { delta };
          await send(IMAGE_TEXT_SSE_EVENT.text, payload);
        }
        if (req.signal.aborted) return;
        const [fullText, finishReason] = await Promise.all([
          Promise.resolve(result.text).then((text) => (text || '').trim()),
          Promise.resolve(result.finishReason).catch(() => undefined),
        ]);
        if (finishReason === 'length') {
          console.warn('[image-text/plan] output truncated by length', { chars: fullText.length });
          await send(IMAGE_TEXT_SSE_EVENT.error, { message: PLAN_TRUNCATED });
          return;
        }
        if (!fullText) {
          console.warn('[image-text/plan] empty text after stream');
          await send(IMAGE_TEXT_SSE_EVENT.error, { message: PLAN_FAILED });
          return;
        }
        await send(IMAGE_TEXT_SSE_EVENT.done, {});
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[image-text/plan]', err);
        try {
          await send(IMAGE_TEXT_SSE_EVENT.error, { message: PLAN_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}
