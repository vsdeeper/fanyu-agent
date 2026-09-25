import 'server-only';

import { stepCountIs, streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { webSearch } from '@/app/api/chat/_server/tools/catalog/web-search';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { parseImageDataUrlToFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { LONG_ARTICLE_SSE_EVENT } from '../_shared/constants';
import type { LongArticleSseTextEvent } from '../_shared/types';
import {
  DRAFT_FAILED,
  DRAFT_TRUNCATED,
  IMAGES_FAILED,
  IMAGES_TRUNCATED,
  MISSING_RESEARCH_INPUT,
  PLAN_FAILED,
  PLAN_TRUNCATED,
  RESEARCH_FAILED,
  RESEARCH_MAX_PARALLEL_SEARCHES,
  RESEARCH_MAX_SEARCH_CALLS,
  RESEARCH_MAX_SEARCH_ROUNDS,
  RESEARCH_MAX_STEPS,
  RESEARCH_NARRATIVE_MAX_PARALLEL_SEARCHES,
  RESEARCH_NARRATIVE_MAX_SEARCH_CALLS,
  RESEARCH_NARRATIVE_MAX_SEARCH_ROUNDS,
  RESEARCH_TRUNCATED,
  LONG_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS,
  LONG_ARTICLE_IMAGES_MAX_OUTPUT_TOKENS,
  LONG_ARTICLE_PLAN_MAX_OUTPUT_TOKENS,
  LONG_ARTICLE_RESEARCH_MAX_OUTPUT_TOKENS,
} from './constants';
import {
  DRAFT_INSTRUCTIONS,
  IMAGES_INSTRUCTIONS,
  PLAN_INSTRUCTIONS,
  RESEARCH_INSTRUCTIONS,
} from './instructions';
import { parseDraftBody, parseImagesBody, parsePlanBody, parseResearchBody } from './parse-request';
import {
  buildDraftPrompt,
  buildImagesPrompt,
  buildPlanPrompt,
  buildResearchPrompt,
} from './prompt';
import { withWebSearchCallBudget } from './with-web-search-budget';

type SseSend = (event: string, data: unknown) => Promise<void>;

type TextStreamResult = {
  textStream: AsyncIterable<string>;
  text: PromiseLike<string>;
  finishReason: PromiseLike<string | undefined>;
};

/** 推送 streamText 文本流到 SSE；length 截断时返回错误事件而非假成功。 */
async function pipeTextStream(
  result: TextStreamResult,
  signal: AbortSignal,
  send: SseSend,
  emptyErrorMessage: string,
  truncatedErrorMessage?: string,
): Promise<void> {
  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    if (!delta) continue;
    const payload: LongArticleSseTextEvent = { delta };
    await send(LONG_ARTICLE_SSE_EVENT.text, payload);
  }
  if (signal.aborted) return;
  const [fullText, finishReason] = await Promise.all([
    Promise.resolve(result.text).then((text) => (text || '').trim()),
    Promise.resolve(result.finishReason).catch(() => undefined),
  ]);
  if (finishReason === 'length') {
    console.warn('[long-article] output truncated by length', {
      chars: fullText.length,
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    await send(LONG_ARTICLE_SSE_EVENT.error, {
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    return;
  }
  if (!fullText) {
    console.warn('[long-article] empty text after stream', emptyErrorMessage);
    await send(LONG_ARTICLE_SSE_EVENT.error, { message: emptyErrorMessage });
    return;
  }
  await send(LONG_ARTICLE_SSE_EVENT.done, {});
}

/** 构造主模型 OpenAI providerOptions（沿用 Provider 默认 reasoning，勿用标题档 none）。 */
function buildOpenaiOptions() {
  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  return {
    provider,
    runtime,
    openaiOptions: {
      ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
      ...runtime.getOpenAIOptions(),
    },
  };
}

/**
 * POST /api/studio/long-article/research：联网调研并流式输出简报、参考来源与角度卡。
 */
export async function handleLongArticleResearch(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseResearchBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }
  const hasResearchInput = Boolean(
    body.idea?.trim() || body.experience?.trim() || body.viewpoint?.trim(),
  );
  if (!hasResearchInput) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_RESEARCH_INPUT, 400);
  }
  const narrative = Boolean(body.experience?.trim());
  const maxSearchRounds = narrative
    ? RESEARCH_NARRATIVE_MAX_SEARCH_ROUNDS
    : RESEARCH_MAX_SEARCH_ROUNDS;
  const maxSearchCalls = narrative
    ? RESEARCH_NARRATIVE_MAX_SEARCH_CALLS
    : RESEARCH_MAX_SEARCH_CALLS;
  const maxParallel = narrative
    ? RESEARCH_NARRATIVE_MAX_PARALLEL_SEARCHES
    : RESEARCH_MAX_PARALLEL_SEARCHES;

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const usesSdkWebSearch = runtime.getCapabilities().usesSdkWebSearchTool;
        // 轮数 + 总次数双约束；并行上限靠提示（Provider 原生工具无法在单步内截断并行）
        const budgetHint = narrative
          ? `叙事调研额外约束：web_search 按需、最多 ${maxSearchRounds} 轮且全程最多 ${maxSearchCalls} 次（每轮并行≤${maxParallel}）；经历已够写故事可不搜；达上限后必须输出短简报与切入 JSON。`
          : `选题调研额外约束：web_search 最多 ${maxSearchRounds} 轮且全程最多 ${maxSearchCalls} 次（每轮并行≤${maxParallel} 个关键词，宜少而准）；达上限后立刻写简报与 JSON，禁止继续检索。`;
        const searchHint = usesSdkWebSearch
          ? `\n\n${budgetHint}`
          : `\n\n${webSearch.getHint()}\n${budgetHint}`;
        const localWebSearch = withWebSearchCallBudget(
          webSearch.create({ chatId: 'long-article-research' }),
          maxSearchCalls,
        );
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: RESEARCH_INSTRUCTIONS + searchHint,
          prompt: buildResearchPrompt(body),
          abortSignal: req.signal,
          maxOutputTokens: LONG_ARTICLE_RESEARCH_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
          tools: usesSdkWebSearch
            ? {
                web_search: runtime
                  .getClient()
                  .tools.webSearch(runtime.getWebSearchArgs(undefined)),
              }
            : {
                web_search: localWebSearch,
              },
          // 论证模式首步强制联网；叙事模式不强制。轮数或总次数触顶后关掉工具
          prepareStep: ({ steps }) => {
            if (steps.length === 0) {
              if (narrative) return {};
              return { toolChoice: { type: 'tool' as const, toolName: 'web_search' as const } };
            }
            const searchRounds = steps.filter((step) => step.toolCalls.length > 0).length;
            const searchCalls = steps.reduce(
              (sum, step) =>
                sum + step.toolCalls.filter((call) => call.toolName === 'web_search').length,
              0,
            );
            if (searchRounds >= maxSearchRounds || searchCalls >= maxSearchCalls) {
              return { toolChoice: 'none' as const };
            }
            return {};
          },
          stopWhen: stepCountIs(RESEARCH_MAX_STEPS),
        });
        await pipeTextStream(result, req.signal, send, RESEARCH_FAILED, RESEARCH_TRUNCATED);
        try {
          const [steps, fullText] = await Promise.all([
            result.steps,
            Promise.resolve(result.text).then((text) => (text || '').trim()),
          ]);
          const toolNames = steps.flatMap((step) => step.toolCalls.map((call) => call.toolName));
          const hasJsonFence = /```json\b/i.test(fullText);
          console.info('[long-article/research] toolCalls', toolNames, {
            chars: fullText.length,
            hasJsonFence,
            narrative,
            maxSearchRounds,
            maxSearchCalls,
            searchCallCount: toolNames.filter((name) => name === 'web_search').length,
          });
          if (!hasJsonFence) {
            console.warn('[long-article/research] missing trailing ```json block');
          }
        } catch (err) {
          console.warn('[long-article/research] steps log failed', err);
        }
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[long-article/research]', err);
        try {
          await send(LONG_ARTICLE_SSE_EVENT.error, { message: RESEARCH_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/long-article/plan：根据角度与参考来源生成轻量内容思路。
 */
export async function handleLongArticlePlan(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parsePlanBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: PLAN_INSTRUCTIONS,
          prompt: buildPlanPrompt(body),
          abortSignal: req.signal,
          maxOutputTokens: LONG_ARTICLE_PLAN_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, PLAN_FAILED, PLAN_TRUNCATED);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[long-article/plan]', err);
        try {
          await send(LONG_ARTICLE_SSE_EVENT.error, { message: PLAN_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/long-article/draft：按思路与可选风格样本流式成稿。
 */
export async function handleLongArticleDraft(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseDraftBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: DRAFT_INSTRUCTIONS,
          prompt: buildDraftPrompt(body),
          abortSignal: req.signal,
          maxOutputTokens: LONG_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, DRAFT_FAILED, DRAFT_TRUNCATED);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[long-article/draft]', err);
        try {
          await send(LONG_ARTICLE_SSE_EVENT.error, { message: DRAFT_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/long-article/images：在成稿正文中规划配图标注与槽位。
 */
export async function handleLongArticleImages(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseImagesBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const promptText = buildImagesPrompt(body);
        const stylePart = body.styleReferenceDataUrl
          ? parseImageDataUrlToFilePart(body.styleReferenceDataUrl)
          : null;
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: IMAGES_INSTRUCTIONS,
          ...(stylePart
            ? {
                messages: [
                  {
                    role: 'user' as const,
                    content: [
                      { type: 'text' as const, text: promptText },
                      {
                        type: 'text' as const,
                        text: '以下附件是【风格参考图】，请据此提炼 visualStyle：',
                      },
                      stylePart,
                    ],
                  },
                ],
              }
            : { prompt: promptText }),
          abortSignal: req.signal,
          maxOutputTokens: LONG_ARTICLE_IMAGES_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, IMAGES_FAILED, IMAGES_TRUNCATED);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[long-article/images]', err);
        try {
          await send(LONG_ARTICLE_SSE_EVENT.error, { message: IMAGES_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}
