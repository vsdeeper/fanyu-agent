import 'server-only';

import { streamText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { analyzeImage, formatVisionAnalysisText } from '@/app/api/images/_server/vision';
import { ANALYZE_SSE_EVENT } from '@/app/api/ecommerce/_shared/constants';
import type {
  EcommerceAnalyzeRequest,
  EcommerceAnalyzeTextEvent,
} from '@/app/api/ecommerce/_shared/types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { ANALYZE_INSTRUCTIONS } from './analyze-instructions';
import {
  ANALYZE_FAILED,
  INVALID_FORM,
  INVALID_JSON,
  MISSING_PRODUCT_IMAGE,
  PDF_MEDIA_TYPE,
} from './constants';
import { extractStudioDocuments, formatDocumentsPrompt } from './extract-documents';
import { parseAnalyzeBody } from './parse-request';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from './stream-encode';

type SseSend = (event: string, data: unknown) => Promise<void>;

/**
 * 把识图结果与产品资料拼成 streamText 的用户 prompt。
 */
function buildAnalyzePrompt(input: { documentsText: string; visionText: string }): string {
  return [
    '【工作台商业分析】请按指令输出九段可见 Markdown。本轮不要出图、不要 slots JSON。',
    `- 产品资料：${input.documentsText}`,
    input.visionText,
  ].join('\n');
}

/**
 * 识图 + streamText，把 text / done 写入已建立的 SSE。不落盘会话或图片资产。
 */
async function pipeAnalyzeEvents(
  body: EcommerceAnalyzeRequest,
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
  if (body.images.length === 0) {
    await send(ANALYZE_SSE_EVENT.error, { message: MISSING_PRODUCT_IMAGE });
    return;
  }

  const visionChunks: string[] = [];
  for (const image of body.images) {
    if (signal.aborted) return;
    const vision = await analyzeImage(
      image.dataUrl,
      '请描述这件商品的品类、材质、颜色、形状、卖点与适合的电商画面气质',
      signal,
    );
    if (vision.ok) {
      visionChunks.push(formatVisionAnalysisText(vision.analysis));
    } else {
      console.error('[ecommerce/analyze] analyzeImage', vision.error);
    }
  }

  if (visionChunks.length === 0) {
    await send(ANALYZE_SSE_EVENT.error, { message: ANALYZE_FAILED });
    return;
  }

  const extracted = await extractStudioDocuments(body.documents);
  for (const image of extracted.images) {
    if (signal.aborted) return;
    const vision = await analyzeImage(
      image.dataUrl,
      '这是产品资料图。请描述其中的品牌、包装、文案、色板、卖点、版式与可复用的视觉线索',
      signal,
    );
    if (vision.ok) {
      extracted.texts.push(
        `资料图「${image.filename}」：\n${formatVisionAnalysisText(vision.analysis)}`,
      );
    } else {
      console.error('[ecommerce/analyze] document image', vision.error);
    }
  }

  const prompt = buildAnalyzePrompt({
    documentsText: formatDocumentsPrompt(extracted),
    visionText: visionChunks.join('\n\n'),
  });

  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  const openaiOptions = {
    ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
    ...runtime.getOpenAIOptions(),
    // 可见 Markdown 尽快流出；长思考会让前端长时间停在空结果
    reasoningEffort: getTitleReasoningEffort(provider),
  };

  const result =
    extracted.pdfs.length > 0
      ? streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: ANALYZE_INSTRUCTIONS,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text' as const, text: prompt },
                ...extracted.pdfs.map((pdf) => ({
                  type: 'file' as const,
                  data: pdf.bytes,
                  mediaType: PDF_MEDIA_TYPE,
                  filename: pdf.filename,
                })),
              ],
            },
          ],
          abortSignal: signal,
          providerOptions: { openai: openaiOptions },
        })
      : streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: ANALYZE_INSTRUCTIONS,
          prompt,
          abortSignal: signal,
          providerOptions: { openai: openaiOptions },
        });

  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    if (!delta) continue;
    const payload: EcommerceAnalyzeTextEvent = { delta };
    await send(ANALYZE_SSE_EVENT.text, payload);
  }

  if (signal.aborted) return;

  const fullText = ((await result.text) || '').trim();
  if (!fullText) {
    await send(ANALYZE_SSE_EVENT.error, { message: ANALYZE_FAILED });
    return;
  }

  await send(ANALYZE_SSE_EVENT.done, {});
}

/**
 * POST /api/ecommerce/analyze：校验后立刻推 SSE，识图与规划在流内进行。
 */
export async function handleEcommerceAnalyze(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseAnalyzeBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        await pipeAnalyzeEvents(body, req.signal, send);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[ecommerce/analyze]', err);
        try {
          await send(ANALYZE_SSE_EVENT.error, { message: ANALYZE_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}
