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
import { parseImageDataUrlToFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { buildAnalyzePrompt } from './analyze-prompt';
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

type UserContentPart =
  { type: 'text'; text: string } | { type: 'file'; data: Buffer; mediaType: string };

function analyzeInstructions(kind: EcommerceAnalyzeKind): string {
  return kind === 'detailImage'
    ? DETAIL_IMAGE_ANALYZE_INSTRUCTIONS
    : MAIN_IMAGE_ANALYZE_INSTRUCTIONS;
}

/**
 * 抽取商业分析与可选产品资料；品牌 Logo 以 file part 直达主模型，流式输出策划 Markdown。
 */
async function pipeAnalyzeEvents(
  kind: EcommerceAnalyzeKind,
  documents: { filename: string; mediaType: string; dataUrl: string }[],
  options: {
    productDocuments?: { filename: string; mediaType: string; dataUrl: string }[];
    brandLogoDataUrl?: string;
  },
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
  const extracted = await extractStudioDocuments(documents);
  // formatDocumentsPrompt 在无文本时返回占位串，故判空必须看 texts —— 用返回串判空会把占位串当成商业分析写进 prompt
  const documentsText = extracted.texts.length > 0 ? formatDocumentsPrompt(extracted) : '';
  if (!documentsText) {
    await send(ANALYZE_SSE_EVENT.error, { message: EMPTY_ANALYSIS_DOC });
    return;
  }

  let productDocsText: string | undefined;
  if (options.productDocuments?.length) {
    const extractedProduct = await extractStudioDocuments(options.productDocuments);
    if (extractedProduct.texts.length > 0) {
      productDocsText = formatDocumentsPrompt(extractedProduct);
    }
  }

  let brandLogoPart: ReturnType<typeof parseImageDataUrlToFilePart> = null;
  if (options.brandLogoDataUrl) {
    brandLogoPart = parseImageDataUrlToFilePart(options.brandLogoDataUrl);
    if (!brandLogoPart) {
      console.error('[ecommerce/analyze] invalid brand logo dataUrl');
    }
  }
  if (signal.aborted) return;

  const hasBrandLogo = Boolean(brandLogoPart);
  const promptText = buildAnalyzePrompt(kind, documentsText, { productDocsText, hasBrandLogo });
  const content: UserContentPart[] = [{ type: 'text', text: promptText }];
  if (brandLogoPart) {
    content.push({ type: 'text', text: '以下附件是品牌 Logo：' });
    content.push(brandLogoPart);
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
    messages: [{ role: 'user', content }],
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
 * POST /api/studio/ecommerce/analyze：商业分析文档 + 可选品牌 Logo 原图 + 可选补充产品资料，
 * 按 kind 规划主图或详情图主题卡。Logo 原图以多模态附件直达主模型。
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
        await pipeAnalyzeEvents(body.kind, body.documents, body, req.signal, send);
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
