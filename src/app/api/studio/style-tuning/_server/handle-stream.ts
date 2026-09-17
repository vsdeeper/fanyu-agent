import 'server-only';

import { streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { STYLE_TUNING_SSE_EVENT } from '../_shared/constants';
import type { StyleTuningSseTextEvent } from '../_shared/types';
import {
  MISSING_STYLE,
  MISSING_TOPIC_CONTENT,
  SOFT_TUNE_FAILED,
  SOFT_TUNE_TRUNCATED,
  STYLE_TUNING_SOFT_TUNE_MAX_OUTPUT_TOKENS,
  STYLE_TUNING_TRIAL_WRITE_MAX_OUTPUT_TOKENS,
  TRIAL_WRITE_FAILED,
  TRIAL_WRITE_TRUNCATED,
} from './constants';
import { SOFT_TUNE_INSTRUCTIONS, TRIAL_WRITE_INSTRUCTIONS } from './instructions';
import { parseSoftTuneBody, parseTrialWriteBody } from './parse-request';
import { buildSoftTunePrompt, buildTrialWritePrompt } from './prompt';

type SseSend = (event: string, data: unknown) => Promise<void>;

type TextStreamResult = {
  textStream: AsyncIterable<string>;
  text: PromiseLike<string>;
  finishReason: PromiseLike<string | undefined>;
};

type PipeTextStreamOptions = {
  emptyErrorMessage: string;
  truncatedErrorMessage?: string;
  /** 已有正文时把 length 截断当成功；试写可保留半成品，软调仍须完整 JSON。 */
  acceptTruncated?: boolean;
};

/** 推送 streamText 文本流到 SSE；length 截断默认返回错误事件而非假成功。 */
async function pipeTextStream(
  result: TextStreamResult,
  signal: AbortSignal,
  send: SseSend,
  options: PipeTextStreamOptions,
): Promise<void> {
  const { emptyErrorMessage, truncatedErrorMessage, acceptTruncated } = options;
  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    if (!delta) continue;
    const payload: StyleTuningSseTextEvent = { delta };
    await send(STYLE_TUNING_SSE_EVENT.text, payload);
  }
  if (signal.aborted) return;
  const [fullText, finishReason] = await Promise.all([
    Promise.resolve(result.text).then((text) => (text || '').trim()),
    Promise.resolve(result.finishReason).catch(() => undefined),
  ]);
  if (finishReason === 'length') {
    if (acceptTruncated && fullText) {
      console.warn('[style-tuning] output truncated by length, keeping text', {
        chars: fullText.length,
      });
      await send(STYLE_TUNING_SSE_EVENT.done, {});
      return;
    }
    console.warn('[style-tuning] output truncated by length', {
      chars: fullText.length,
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    await send(STYLE_TUNING_SSE_EVENT.error, {
      message: truncatedErrorMessage ?? emptyErrorMessage,
    });
    return;
  }
  if (!fullText) {
    console.warn('[style-tuning] empty text after stream', emptyErrorMessage);
    await send(STYLE_TUNING_SSE_EVENT.error, { message: emptyErrorMessage });
    return;
  }
  await send(STYLE_TUNING_SSE_EVENT.done, {});
}

/** 构造主模型 OpenAI providerOptions。 */
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
 * POST /api/studio/style-tuning/softtune：流式生成六维软调参数。
 */
export async function handleStyleTuningSoftTune(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseSoftTuneBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }
  if (!body.topicContent.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_TOPIC_CONTENT, 400);
  }
  if (!body.stylePrompt.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_STYLE, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: SOFT_TUNE_INSTRUCTIONS,
          prompt: buildSoftTunePrompt(body),
          abortSignal: req.signal,
          maxOutputTokens: STYLE_TUNING_SOFT_TUNE_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, {
          emptyErrorMessage: SOFT_TUNE_FAILED,
          truncatedErrorMessage: SOFT_TUNE_TRUNCATED,
        });
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[style-tuning/softtune]', err);
        try {
          await send(STYLE_TUNING_SSE_EVENT.error, { message: SOFT_TUNE_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/**
 * POST /api/studio/style-tuning/trialwrite：按软参数流式试写。
 */
export async function handleStyleTuningTrialWrite(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseTrialWriteBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }
  if (!body.topicContent.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_TOPIC_CONTENT, 400);
  }

  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        const { provider, runtime, openaiOptions } = buildOpenaiOptions();
        const result = streamText({
          model: runtime.getMainModel(getModelId(provider, 'pro')),
          instructions: TRIAL_WRITE_INSTRUCTIONS,
          prompt: buildTrialWritePrompt(body),
          abortSignal: req.signal,
          maxOutputTokens: STYLE_TUNING_TRIAL_WRITE_MAX_OUTPUT_TOKENS,
          providerOptions: { openai: openaiOptions },
        });
        await pipeTextStream(result, req.signal, send, {
          emptyErrorMessage: TRIAL_WRITE_FAILED,
          truncatedErrorMessage: TRIAL_WRITE_TRUNCATED,
          acceptTruncated: true,
        });
      } catch (err) {
        if (req.signal.aborted) return;
        console.error('[style-tuning/trialwrite]', err);
        try {
          await send(STYLE_TUNING_SSE_EVENT.error, { message: TRIAL_WRITE_FAILED });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}
