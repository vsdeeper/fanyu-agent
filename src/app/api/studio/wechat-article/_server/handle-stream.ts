import 'server-only';

import { stepCountIs, streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { webSearch } from '@/app/api/chat/_server/tools/catalog/web-search';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { WECHAT_ARTICLE_SSE_EVENT } from '../_shared/constants';
import type { WechatArticleSseTextEvent } from '../_shared/types';
import {
  DRAFT_FAILED,
  DRAFT_TRUNCATED,
  MISSING_IDEA,
  PLAN_FAILED,
  PLAN_TRUNCATED,
  RESEARCH_FAILED,
  RESEARCH_MAX_SEARCH_ROUNDS,
  RESEARCH_MAX_STEPS,
  WECHAT_ARTICLE_PLAN_MAX_OUTPUT_TOKENS,
  resolveDraftMaxOutputTokens,
} from './constants';
import { DRAFT_INSTRUCTIONS, PLAN_INSTRUCTIONS, RESEARCH_INSTRUCTIONS } from './instructions';
import { parseDraftBody, parsePlanBody, parseResearchBody } from './parse-request';
import { buildDraftPrompt, buildPlanPrompt, buildResearchPrompt } from './prompt';

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
    const payload: WechatArticleSseTextEvent = { delta };
    await send(WECHAT_ARTICLE_SSE_EVENT.text, payload);
  }
  if (signal.aborted) return;
  const [fullText, finishReason] = await Promise.all([
    Promise.resolve(result.text).then((text) => (text || '').trim()),
    Promise.resolve(result.finishReason).catch(() => undefined),
  ]);
  if (finishReason === 'length') {
    console.warn('[wechat-article] output truncated by length', {
      chars: fullText.length,
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    await send(WECHAT_ARTICLE_SSE_EVENT.error, {
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    return;
  }
  if (!fullText) {
    console.warn('[wechat-article] empty text after stream', emptyErrorMessage);
    await send(WECHAT_ARTICLE_SSE_EVENT.error, { message: emptyErrorMessage });
    return;
  }
  await send(WECHAT_ARTICLE_SSE_EVENT.done, {});
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
 * POST /api/studio/wechat-article/research：联网调研并流式输出简报、参考来源与角度卡。
 */
export async function handleWechatArticleResearch(req: Request): Promise<Response> {
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
  if (!body.idea.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_IDEA, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const usesSdkWebSearch = runtime.getCapabilities().usesSdkWebSearchTool;
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions:
            RESEARCH_INSTRUCTIONS +
            (usesSdkWebSearch
              ? ''
              : `\n\n${webSearch.getHint()}\n选题调研额外约束：web_search 最多 3 轮，随后必须输出简报与 JSON，禁止继续检索。`),
          prompt: buildResearchPrompt(body),
          abortSignal: req.signal,
          providerOptions: { openai: openaiOptions },
          tools: usesSdkWebSearch
            ? {
                web_search: runtime
                  .getClient()
                  .tools.webSearch(runtime.getWebSearchArgs(undefined)),
              }
            : {
                web_search: webSearch.create({ chatId: 'wechat-article-research' }),
              },
          // 首步强制联网；搜满轮次后关掉工具，避免只搜不写导致空正文失败
          prepareStep: ({ steps }) => {
            if (steps.length === 0) {
              return { toolChoice: { type: 'tool' as const, toolName: 'web_search' as const } };
            }
            const searchRounds = steps.filter((step) => step.toolCalls.length > 0).length;
            if (searchRounds >= RESEARCH_MAX_SEARCH_ROUNDS) {
              return { toolChoice: 'none' as const };
            }
            return {};
          },
          stopWhen: stepCountIs(RESEARCH_MAX_STEPS),
        });
        await pipeTextStream(result, req.signal, send, RESEARCH_FAILED);
        try {
          const steps = await result.steps;
          const toolNames = steps.flatMap((step) => step.toolCalls.map((call) => call.toolName));
          console.info('[wechat-article/research] toolCalls', toolNames);
        } catch (err) {
          console.warn('[wechat-article/research] steps log failed', err);
        }
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[wechat-article/research]', err);
        try {
          await send(WECHAT_ARTICLE_SSE_EVENT.error, { message: RESEARCH_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/wechat-article/plan：根据角度与参考来源生成轻量内容思路。
 */
export async function handleWechatArticlePlan(req: Request): Promise<Response> {
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
          maxOutputTokens: WECHAT_ARTICLE_PLAN_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, PLAN_FAILED, PLAN_TRUNCATED);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[wechat-article/plan]', err);
        try {
          await send(WECHAT_ARTICLE_SSE_EVENT.error, { message: PLAN_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/wechat-article/draft：按思路与可选风格样本流式成稿。
 */
export async function handleWechatArticleDraft(req: Request): Promise<Response> {
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
          maxOutputTokens: resolveDraftMaxOutputTokens(body.lengthLimit),
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, DRAFT_FAILED, DRAFT_TRUNCATED);
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[wechat-article/draft]', err);
        try {
          await send(WECHAT_ARTICLE_SSE_EVENT.error, { message: DRAFT_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}
