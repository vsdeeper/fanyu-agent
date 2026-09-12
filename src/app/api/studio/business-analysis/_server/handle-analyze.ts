import 'server-only';

import { streamText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { analyzeImage, formatVisionAnalysisText } from '@/app/api/images/_server/vision';
import { ANALYZE_SSE_EVENT } from '@/app/api/studio/business-analysis/_shared/constants';
import type {
  BusinessAnalysisAnalyzeRequest,
  BusinessAnalysisAnalyzeTextEvent,
} from '@/app/api/studio/business-analysis/_shared/types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { ANALYZE_INSTRUCTIONS } from './analyze-instructions';
import { ANALYZE_FAILED, BRAND_LOGO_VISION_QUESTION, MISSING_ANALYZE_MATERIAL } from './constants';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { buildAnalyzePrompt } from './analyze-prompt';
import { extractStudioDocuments, formatDocumentsPrompt } from './extract-documents';
import { parseAnalyzeBody } from './parse-analyze-request';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';

type SseSend = (event: string, data: unknown) => Promise<void>;

/**
 * 品牌 Logo 识图；未提供或识图失败返回 undefined，由 prompt 组装按「无品牌素材」处理。
 */
async function describeBrandLogo(
  dataUrl: string | undefined,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (!dataUrl || signal.aborted) return undefined;
  const vision = await analyzeImage(dataUrl, BRAND_LOGO_VISION_QUESTION, signal);
  if (!vision.ok) {
    console.error('[business-analysis/analyze] brand logo vision', vision.error);
    return undefined;
  }
  return formatVisionAnalysisText(vision.analysis);
}

/**
 * 识图 + streamText，把 text / done 写入已建立的 SSE。不落盘会话或图片资产。
 */
async function pipeAnalyzeEvents(
  body: BusinessAnalysisAnalyzeRequest,
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
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
      console.error('[business-analysis/analyze] analyzeImage', vision.error);
    }
  }

  const extracted = await extractStudioDocuments(body.documents);
  const productDescription = body.productDescription?.trim();
  // Logo 的识图结果单独攒，不能混进产品图那段 —— 混进去模型会把 Logo 描述当成产品本体
  const brandLogoText = await describeBrandLogo(body.brandLogoDataUrl, signal);

  const hasTextMaterial =
    Boolean(brandLogoText) || Boolean(productDescription) || extracted.texts.length > 0;
  if (visionChunks.length === 0 && !hasTextMaterial) {
    await send(ANALYZE_SSE_EVENT.error, {
      // 传了产品图却全识图失败属上游故障，与「四项素材本来就没填」要分开报
      message: body.images.length > 0 ? ANALYZE_FAILED : MISSING_ANALYZE_MATERIAL,
    });
    return;
  }

  const prompt = buildAnalyzePrompt({
    productDescription,
    // 判「有没有资料」看 texts.length：坏文件会被 extractStudioDocuments 静默跳过，
    // 只看 body.documents.length 会让一份没解析出文本的资料冒充素材
    documentsText: extracted.texts.length > 0 ? formatDocumentsPrompt(extracted) : '',
    visionText: visionChunks.join('\n\n'),
    brandLogoText,
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

  const result = streamText({
    model: runtime.getMainModel(getModelId(provider, 'pro')),
    instructions: ANALYZE_INSTRUCTIONS,
    prompt,
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
 * POST /api/studio/business-analysis/analyze：校验后立刻推 SSE，识图与规划在流内进行。
 */
export async function handleBusinessAnalysisAnalyze(req: Request): Promise<Response> {
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
        console.error('[business-analysis/analyze]', err);
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
