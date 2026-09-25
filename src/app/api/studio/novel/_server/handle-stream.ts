import 'server-only';

import { streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { INVALID_JSON } from '@/app/api/studio/_server/constants';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { NOVEL_SSE_EVENT } from '../_shared/constants';
import type { NovelSseTextEvent } from '../_shared/types';
import {
  CHAPTER_BEATS_FAILED,
  CHAPTER_BEATS_TRUNCATED,
  MISSING_CHAPTER_BEATS_INPUT,
  MISSING_RESEARCH_INPUT,
  MISSING_STRUCTURE_INPUT,
  MISSING_VOLUME_CHAPTERS_INPUT,
  MISSING_WRITING_INPUT,
  NOVEL_CHAPTER_BEATS_MAX_OUTPUT_TOKENS,
  NOVEL_RESEARCH_MAX_OUTPUT_TOKENS,
  NOVEL_STRUCTURE_MAX_OUTPUT_TOKENS,
  NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS,
  NOVEL_WRITING_MAX_OUTPUT_TOKENS,
  RESEARCH_FAILED,
  RESEARCH_TRUNCATED,
  STRUCTURE_FAILED,
  STRUCTURE_TRUNCATED,
  VOLUME_CHAPTERS_FAILED,
  VOLUME_CHAPTERS_TRUNCATED,
  WRITING_FAILED,
  WRITING_TRUNCATED,
} from './constants';
import {
  CHAPTER_BEATS_INSTRUCTIONS,
  RESEARCH_INSTRUCTIONS,
  STRUCTURE_INSTRUCTIONS,
  VOLUME_CHAPTERS_INSTRUCTIONS,
  WRITING_INSTRUCTIONS,
} from './instructions';
import {
  parseChapterBeatsBody,
  parseResearchBody,
  parseStructureBody,
  parseVolumeChaptersBody,
  parseWritingBody,
} from './parse-request';
import {
  buildChapterBeatsPrompt,
  buildResearchPrompt,
  buildStructurePrompt,
  buildVolumeChaptersPrompt,
  buildWritingPrompt,
} from './prompt';

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
  truncatedErrorMessage: string,
  logTag: string,
): Promise<void> {
  for await (const delta of result.textStream) {
    if (signal.aborted) return;
    if (!delta) continue;
    const payload: NovelSseTextEvent = { delta };
    await send(NOVEL_SSE_EVENT.text, payload);
  }
  if (signal.aborted) return;
  const [fullText, finishReason] = await Promise.all([
    Promise.resolve(result.text).then((text) => (text || '').trim()),
    Promise.resolve(result.finishReason).catch(() => undefined),
  ]);
  if (finishReason === 'length') {
    console.warn(`[${logTag}] output truncated by length`, { chars: fullText.length });
    await send(NOVEL_SSE_EVENT.error, { message: truncatedErrorMessage });
    return;
  }
  if (!fullText) {
    console.warn(`[${logTag}] empty text after stream`);
    await send(NOVEL_SSE_EVENT.error, { message: emptyErrorMessage });
    return;
  }
  await send(NOVEL_SSE_EVENT.done, {});
}

function createProStream(params: {
  instructions: string;
  prompt: string;
  maxOutputTokens: number;
  abortSignal: AbortSignal;
}) {
  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  const openaiOptions = {
    ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
    ...runtime.getOpenAIOptions(),
  };
  return streamText({
    model: runtime.getMainModel(getModelId(provider, 'pro')),
    instructions: params.instructions,
    messages: [{ role: 'user', content: params.prompt }],
    abortSignal: params.abortSignal,
    maxOutputTokens: params.maxOutputTokens,
    providerOptions: { openai: openaiOptions },
  });
}

function createNovelSse(
  logTag: string,
  failedMessage: string,
  run: (send: SseSend) => Promise<void>,
): Response {
  return createPushStreamResponse(
    SSE_STREAM_HEADERS,
    async (write) => {
      const send: SseSend = (event, data) => write(encodeSseEvent(event, data));
      try {
        await run(send);
      } catch (err) {
        console.error(`[${logTag}]`, err);
        try {
          await send(NOVEL_SSE_EVENT.error, { message: failedMessage });
        } catch {
          /* 流已关闭 */
        }
      }
    },
    encodeSsePrelude(),
  );
}

/** POST /api/studio/novel/research：流式产出选题卡。 */
export async function handleNovelResearch(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseResearchBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_RESEARCH_INPUT, 400);
  }

  return createNovelSse('novel/research', RESEARCH_FAILED, async (send) => {
    const result = createProStream({
      instructions: RESEARCH_INSTRUCTIONS,
      prompt: buildResearchPrompt(body),
      maxOutputTokens: NOVEL_RESEARCH_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
    });
    await pipeTextStream(
      result,
      req.signal,
      send,
      RESEARCH_FAILED,
      RESEARCH_TRUNCATED,
      'novel/research',
    );
  });
}

/** POST /api/studio/novel/structure：流式产出故事结构。 */
export async function handleNovelStructure(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseStructureBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_STRUCTURE_INPUT, 400);
  }

  return createNovelSse('novel/structure', STRUCTURE_FAILED, async (send) => {
    const result = createProStream({
      instructions: STRUCTURE_INSTRUCTIONS,
      prompt: buildStructurePrompt(body),
      maxOutputTokens: NOVEL_STRUCTURE_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
    });
    await pipeTextStream(
      result,
      req.signal,
      send,
      STRUCTURE_FAILED,
      STRUCTURE_TRUNCATED,
      'novel/structure',
    );
  });
}

/** POST /api/studio/novel/volume-chapters：流式产出指定卷的章纲。 */
export async function handleNovelVolumeChapters(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseVolumeChaptersBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_VOLUME_CHAPTERS_INPUT, 400);
  }

  return createNovelSse('novel/volume-chapters', VOLUME_CHAPTERS_FAILED, async (send) => {
    const result = createProStream({
      instructions: VOLUME_CHAPTERS_INSTRUCTIONS,
      prompt: buildVolumeChaptersPrompt(body),
      maxOutputTokens: NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
    });
    await pipeTextStream(
      result,
      req.signal,
      send,
      VOLUME_CHAPTERS_FAILED,
      VOLUME_CHAPTERS_TRUNCATED,
      'novel/volume-chapters',
    );
  });
}

/** POST /api/studio/novel/chapter-beats：流式产出章内节拍。 */
export async function handleNovelChapterBeats(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseChapterBeatsBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_CHAPTER_BEATS_INPUT, 400);
  }

  return createNovelSse('novel/chapter-beats', CHAPTER_BEATS_FAILED, async (send) => {
    const result = createProStream({
      instructions: CHAPTER_BEATS_INSTRUCTIONS,
      prompt: buildChapterBeatsPrompt(body),
      maxOutputTokens: NOVEL_CHAPTER_BEATS_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
    });
    await pipeTextStream(
      result,
      req.signal,
      send,
      CHAPTER_BEATS_FAILED,
      CHAPTER_BEATS_TRUNCATED,
      'novel/chapter-beats',
    );
  });
}

/** POST /api/studio/novel/writing：流式产出单节拍正文。 */
export async function handleNovelWriting(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseWritingBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_WRITING_INPUT, 400);
  }

  return createNovelSse('novel/writing', WRITING_FAILED, async (send) => {
    if (req.signal.aborted) return;
    const result = createProStream({
      instructions: WRITING_INSTRUCTIONS,
      prompt: buildWritingPrompt(body),
      maxOutputTokens: NOVEL_WRITING_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
    });
    await pipeTextStream(
      result,
      req.signal,
      send,
      WRITING_FAILED,
      WRITING_TRUNCATED,
      'novel/writing',
    );
  });
}
