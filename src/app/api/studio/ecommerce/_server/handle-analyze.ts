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
import { analyzeImage, formatVisionAnalysisText } from '@/app/api/images/_server/vision';
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

function analyzeInstructions(kind: EcommerceAnalyzeKind): string {
  return kind === 'detailImage'
    ? DETAIL_IMAGE_ANALYZE_INSTRUCTIONS
    : MAIN_IMAGE_ANALYZE_INSTRUCTIONS;
}

/** 品牌 Logo 的识图问题：只问主题卡规划用得上的造型与呈现方式，不问画面构图（那由出图环节定）。 */
const BRAND_LOGO_VISION_QUESTION =
  '请描述这个品牌 Logo：造型与图形构成、是否含文字与文字内容、字体特征、主色与辅助色、透明底与否，以及把它作为设计元素融入电商主图画面时适合的呈现方式。';

/**
 * 把品牌 Logo 原图转成中文描述供分析使用；识图失败返回 undefined。
 *
 * 分析用的主模型在缺省 provider（deepseek）下看不见像素，图片不能直接进 streamText，
 * 故与商业分析工作室一致：先经 analyzeImage 转文本，再把文本拼进 prompt。
 * Logo 是可选增强，失败只跳过、不阻断整轮分析。
 */
async function describeBrandLogo(
  dataUrl: string | undefined,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (!dataUrl || signal.aborted) return undefined;
  const vision = await analyzeImage(dataUrl, BRAND_LOGO_VISION_QUESTION, signal);
  if (!vision.ok) {
    console.error('[ecommerce/analyze] brand logo vision', vision.error);
    return undefined;
  }
  return formatVisionAnalysisText(vision.analysis);
}

/**
 * 抽取商业分析、主图说明与可选产品资料，把品牌 Logo 识图结果一并拼进 prompt，流式输出策划 Markdown。
 */
async function pipeAnalyzeEvents(
  kind: EcommerceAnalyzeKind,
  documents: { filename: string; mediaType: string; dataUrl: string }[],
  options: {
    productDocuments?: { filename: string; mediaType: string; dataUrl: string }[];
    mainImageDescription?: string;
    brandLogoDataUrl?: string;
  },
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
  const extracted = await extractStudioDocuments(documents);
  // formatDocumentsPrompt 在无文本时返回占位串，故判空必须看 texts —— 用返回串判空会把占位串当成商业分析写进 prompt
  const documentsText = extracted.texts.length > 0 ? formatDocumentsPrompt(extracted) : '';
  const descriptionText = options.mainImageDescription?.trim() ?? '';
  // 主图的商业分析非必填，两者皆空才报错；此处能走到说明主图说明为空，故 EMPTY_ANALYSIS_DOC 对两种 kind 都成立
  if (!documentsText && !descriptionText) {
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

  // 识图这一步在流开始前跑完，用户会多等一次上游调用；失败不阻断分析
  const brandLogoText = await describeBrandLogo(options.brandLogoDataUrl, signal);
  if (signal.aborted) return;

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
    prompt: buildAnalyzePrompt(kind, documentsText, {
      productDocsText,
      mainImageDescription: descriptionText,
      brandLogoText,
    }),
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
 * POST /api/studio/ecommerce/analyze：商业分析文档（主图可缺省）+ 主图说明 + 品牌 Logo 原图 + 可选补充产品资料，
 * 按 kind 规划主图或详情图主题卡。Logo 原图先经识图转成中文描述再进 prompt。
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
