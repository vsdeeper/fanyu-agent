import 'server-only';

import { streamText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { ANALYZE_SSE_EVENT } from '@/app/api/studio/business-analysis/_shared/constants';
import type { BusinessAnalysisAnalyzeTextEvent } from '@/app/api/studio/business-analysis/_shared/types';
import {
  extractStudioDocuments,
  formatDocumentsPrompt,
} from '@/app/api/studio/business-analysis/_server/extract-documents';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { ANALYZE_FAILED, EMPTY_ANALYSIS_DOC } from './constants';
import {
  DETAIL_IMAGE_ANALYZE_INSTRUCTIONS,
  MAIN_IMAGE_ANALYZE_INSTRUCTIONS,
} from './analyze-instructions';
import { parseEcommerceAnalyzeBody, type EcommerceAnalyzeKind } from './parse-analyze-request';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';

type SseSend = (event: string, data: unknown) => Promise<void>;

/**
 * 把商业分析资料拼成 streamText 的用户 prompt。
 */
function buildAnalyzePrompt(kind: EcommerceAnalyzeKind, documentsText: string): string {
  if (kind === 'detailImage') {
    return [
      '【详情图结构规划】请按指令输出六个互斥主题卡，每张含设计目标与展示重点。本轮不要出图。',
      `- 商业分析：${documentsText}`,
    ].join('\n');
  }
  return [
    '【主图分析】请按指令输出五个互斥主题卡，每张含文案与互斥拍摄场景。本轮不要出图。',
    `- 商业分析：${documentsText}`,
  ].join('\n');
}

function analyzeInstructions(kind: EcommerceAnalyzeKind): string {
  return kind === 'detailImage'
    ? DETAIL_IMAGE_ANALYZE_INSTRUCTIONS
    : MAIN_IMAGE_ANALYZE_INSTRUCTIONS;
}

/**
 * 抽取商业分析并流式输出策划 Markdown。
 */
async function pipeAnalyzeEvents(
  kind: EcommerceAnalyzeKind,
  documents: { filename: string; mediaType: string; dataUrl: string }[],
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
  const extracted = await extractStudioDocuments(documents);
  const documentsText = formatDocumentsPrompt(extracted);
  if (!extracted.texts.length) {
    await send(ANALYZE_SSE_EVENT.error, { message: EMPTY_ANALYSIS_DOC });
    return;
  }

  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  const openaiOptions = {
    ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
    ...runtime.getOpenAIOptions(),
    reasoningEffort: getTitleReasoningEffort(provider),
  };

  const result = streamText({
    model: runtime.getMainModel(getModelId(provider, 'pro')),
    instructions: analyzeInstructions(kind),
    prompt: buildAnalyzePrompt(kind, documentsText),
    abortSignal: signal,
    providerOptions: { openai: openaiOptions },
  });

  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    if (!delta) continue;
    const payload: BusinessAnalysisAnalyzeTextEvent = { delta };
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
 * POST /api/studio/ecommerce/analyze：仅商业分析文档，按 kind 规划主图或详情图主题卡。
 */
export async function handleEcommerceAnalyze(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseEcommerceAnalyzeBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        await pipeAnalyzeEvents(body.kind, body.documents, req.signal, send);
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
