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
  DESIGN_TYPE_LABEL,
  INVALID_FORM,
  INVALID_JSON,
  LANGUAGE_LABEL,
  MISSING_PRODUCT_IMAGE,
  PLATFORM_LABEL,
  SLOTS_PARSE_FAILED,
} from './constants';
import { parseAnalyzeBody } from './parse-request';
import { parseSlotsFromModelText, splitVisibleMarkdown } from './parse-slots';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from './stream-encode';

type SseSend = (event: string, data: unknown) => Promise<void>;

/**
 * 把表单锁定项与识图结果拼成 streamText 的用户 prompt。
 */
function buildAnalyzePrompt(input: {
  designType: string;
  platform: string;
  requirement: string;
  language: string;
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: number;
  visionText: string;
}): string {
  const visual = input.language === 'visual';
  return [
    '【工作台分析】请按指令输出可见规划 Markdown，文末再给 slots JSON。本轮不要出图。',
    `- 类型：${DESIGN_TYPE_LABEL[input.designType] ?? input.designType}`,
    `- 平台：${PLATFORM_LABEL[input.platform] ?? input.platform}`,
    `- 语言：${LANGUAGE_LABEL[input.language] ?? input.language}${visual ? '（图上不入字）' : ''}`,
    `- 模型：${input.model}`,
    `- 比例：${input.aspectRatio}`,
    `- 质量：${input.quality}`,
    `- 清晰度：${input.clarity}`,
    `- 数量：${input.count} 张`,
    `- 需求：${input.requirement.trim() || '（用户未填写，按识图推断）'}`,
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

  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  const prompt = buildAnalyzePrompt({
    ...body,
    visionText: visionChunks.join('\n\n'),
  });

  const result = streamText({
    model: runtime.getMainModel(getModelId(provider, 'pro')),
    instructions: ANALYZE_INSTRUCTIONS,
    prompt,
    abortSignal: signal,
    providerOptions: {
      openai: {
        ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
        ...runtime.getOpenAIOptions(),
        // 规划只要可见 Markdown 尽快流出；长思考会让前端长时间停在空结果
        reasoningEffort: getTitleReasoningEffort(provider),
      },
    },
  });

  let accumulated = '';
  let flushedVisible = '';
  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    accumulated += delta;
    const { visible } = splitVisibleMarkdown(accumulated);
    if (visible.length > flushedVisible.length) {
      const nextDelta = visible.slice(flushedVisible.length);
      flushedVisible = visible;
      const payload: EcommerceAnalyzeTextEvent = { delta: nextDelta };
      await send(ANALYZE_SSE_EVENT.text, payload);
    }
  }

  if (signal.aborted) return;

  const fullText = (await result.text).trim() || accumulated;
  const slots = parseSlotsFromModelText(fullText);
  if (!slots) {
    console.error('[ecommerce/analyze] slots parse failed');
    await send(ANALYZE_SSE_EVENT.error, { message: SLOTS_PARSE_FAILED });
    return;
  }

  await send(ANALYZE_SSE_EVENT.done, { slots: slots.slice(0, body.count) });
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
