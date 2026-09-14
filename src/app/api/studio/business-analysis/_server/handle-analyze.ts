import 'server-only';

import { streamText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { ANALYZE_SSE_EVENT } from '@/app/api/studio/business-analysis/_shared/constants';
import type {
  BusinessAnalysisAnalyzeRequest,
  BusinessAnalysisAnalyzeTextEvent,
} from '@/app/api/studio/business-analysis/_shared/types';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { parseImageDataUrlToFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import { ANALYZE_INSTRUCTIONS } from './analyze-instructions';
import { ANALYZE_FAILED, MISSING_ANALYZE_MATERIAL } from './constants';
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

type UserContentPart =
  { type: 'text'; text: string } | { type: 'file'; data: Buffer; mediaType: string };

/**
 * 主模型多模态 streamText：产品图 / Logo 以 file part 直达，文本资料进同一条 user message。
 * 不落盘会话或图片资产。
 */
async function pipeAnalyzeEvents(
  body: BusinessAnalysisAnalyzeRequest,
  signal: AbortSignal,
  send: SseSend,
): Promise<void> {
  const productImageParts: Array<{ type: 'file'; data: Buffer; mediaType: string }> = [];
  for (const image of body.images) {
    const part = parseImageDataUrlToFilePart(image.dataUrl);
    if (part) {
      productImageParts.push(part);
    } else {
      console.error('[business-analysis/analyze] invalid product image dataUrl');
    }
  }

  let brandLogoPart: ReturnType<typeof parseImageDataUrlToFilePart> = null;
  if (body.brandLogoDataUrl) {
    brandLogoPart = parseImageDataUrlToFilePart(body.brandLogoDataUrl);
    if (!brandLogoPart) {
      console.error('[business-analysis/analyze] invalid brand logo dataUrl');
    }
  }

  const extracted = await extractStudioDocuments(body.documents);
  const productDescription = body.productDescription?.trim();
  const hasProductImages = productImageParts.length > 0;
  const hasBrandLogo = Boolean(brandLogoPart);
  const hasTextMaterial = Boolean(productDescription) || extracted.texts.length > 0;

  if (!hasProductImages && !hasBrandLogo && !hasTextMaterial) {
    await send(ANALYZE_SSE_EVENT.error, {
      // 传了图却全部解码失败属上游/数据故障，与「四项素材本来就没填」分开报
      message:
        body.images.length > 0 || body.brandLogoDataUrl ? ANALYZE_FAILED : MISSING_ANALYZE_MATERIAL,
    });
    return;
  }

  const promptText = buildAnalyzePrompt({
    productDescription,
    // 判「有没有资料」看 texts.length：坏文件会被 extractStudioDocuments 静默跳过，
    // 只看 body.documents.length 会让一份没解析出文本的资料冒充素材
    documentsText: extracted.texts.length > 0 ? formatDocumentsPrompt(extracted) : '',
    hasProductImages,
    hasBrandLogo,
  });

  const content: UserContentPart[] = [{ type: 'text', text: promptText }];
  if (hasProductImages) {
    content.push(...productImageParts);
  }
  if (brandLogoPart) {
    // Logo 与产品图分开标注，避免模型把徽标当成产品本体
    content.push({ type: 'text', text: '以下附件是品牌 Logo：' });
    content.push(brandLogoPart);
  }

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
 * POST /api/studio/business-analysis/analyze：校验后立刻推 SSE，规划在流内进行。
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
