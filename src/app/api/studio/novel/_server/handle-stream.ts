import 'server-only';

import { streamText } from 'ai';
import { getChatProvider, getModelId } from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { INVALID_JSON } from '@/app/api/studio/_server/constants';
import {
  settingsFailResponse,
  splitChatSettings,
  withStudioChatSettings,
} from '@/app/api/studio/_server/with-chat-settings';
import {
  createPushStreamResponse,
  encodeSseEvent,
  encodeSsePrelude,
  SSE_STREAM_HEADERS,
} from '@/app/api/studio/_server/stream-encode';
import { ApiErrorCode, jsonFail } from '@/lib/server/api-response';
import { NOVEL_SSE_EVENT } from '../_shared/constants';
import type { NovelIdeaFile, NovelSseTextEvent } from '../_shared/types';
import {
  CAST_FAILED,
  CAST_TRUNCATED,
  IDEA_FILE_INVALID,
  MISSING_CAST_INPUT,
  MISSING_PLAN_INPUT,
  MISSING_RESEARCH_INPUT,
  MISSING_VOLUME_CHAPTERS_INPUT,
  MISSING_POLISH_INPUT,
  MISSING_WRITING_INPUT,
  NOVEL_CAST_MAX_OUTPUT_TOKENS,
  NOVEL_PLAN_MAX_OUTPUT_TOKENS,
  NOVEL_POLISH_MAX_OUTPUT_TOKENS,
  NOVEL_RESEARCH_MAX_OUTPUT_TOKENS,
  NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS,
  NOVEL_WRITING_MAX_OUTPUT_TOKENS,
  PLAN_FAILED,
  PLAN_TRUNCATED,
  POLISH_FAILED,
  POLISH_TRUNCATED,
  RESEARCH_FAILED,
  RESEARCH_TRUNCATED,
  VOLUME_CHAPTERS_FAILED,
  VOLUME_CHAPTERS_TRUNCATED,
  WRITING_FAILED,
  WRITING_TRUNCATED,
} from './constants';
import { resolveNovelIdeaFiles, type NovelIdeaPdfPart } from './idea-file';
import { resolveNovelReasoningEffort } from './reasoning';
import {
  CAST_INSTRUCTIONS,
  PLAN_INSTRUCTIONS,
  POLISH_INSTRUCTIONS,
  RESEARCH_INSTRUCTIONS,
  VOLUME_CHAPTERS_INSTRUCTIONS,
  WRITING_INSTRUCTIONS,
} from './instructions';
import {
  parseCastBody,
  parsePlanBody,
  parsePolishBody,
  parseResearchBody,
  parseVolumeChaptersBody,
  parseWritingBody,
} from './parse-request';
import {
  buildCastPrompt,
  buildPlanPrompt,
  buildPolishPrompt,
  buildResearchPrompt,
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

/** 从尚未被 schema 裁剪的请求体读取左栏思考强度。 */
function requestReasoningEffort(rest: unknown): unknown {
  if (!rest || typeof rest !== 'object') return undefined;
  return (rest as Record<string, unknown>).reasoningEffort;
}

function createProStream(params: {
  instructions: string;
  prompt: string;
  pdfParts?: NovelIdeaPdfPart[];
  reasoningEffort?: unknown;
  maxOutputTokens: number;
  abortSignal: AbortSignal;
  /** 附件说明。有 PDF 时写在正文之前。 */
  attachmentIntro?: string;
}) {
  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);
  const capabilities = runtime.getCapabilities();
  // 左栏覆盖对话设置里的 reasoningEffort；方舟不传该字段。
  const reasoningEffort = resolveNovelReasoningEffort(provider, params.reasoningEffort);
  const openaiOptions = {
    ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
    ...runtime.getOpenAIOptions(),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
  const pdfParts = params.pdfParts ?? [];
  const content =
    pdfParts.length > 0
      ? [
          { type: 'text' as const, text: params.prompt },
          {
            type: 'text' as const,
            text: params.attachmentIntro ?? '以下附件请直接阅读文件正文：',
          },
          ...pdfParts,
        ]
      : params.prompt;
  return streamText({
    model: runtime.getMainModel(getModelId(provider, 'pro')),
    instructions: params.instructions,
    messages: [{ role: 'user', content }],
    abortSignal: params.abortSignal,
    maxOutputTokens: params.maxOutputTokens,
    providerOptions: { openai: openaiOptions },
  });
}

/** 解码思路文件。未上传视为成功；损坏时返回 400，避免流已经 200 才失败。 */
async function readIdeaFiles(
  files: NovelIdeaFile[] | undefined,
): Promise<{ documentsText: string; pdfParts: NovelIdeaPdfPart[] } | Response> {
  const resolved = await resolveNovelIdeaFiles(files);
  if (!resolved.ok) return jsonFail(ApiErrorCode.INVALID_PARAMS, IDEA_FILE_INVALID, 400);
  return { documentsText: resolved.documentsText, pdfParts: resolved.pdfParts };
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

/** POST /api/studio/novel/bible：流式产出人物与关系。 */
export async function handleNovelBible(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parseCastBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_CAST_INPUT, 400);
  }

  const ideaFiles = await readIdeaFiles(body.ideaFiles);
  if (ideaFiles instanceof Response) return ideaFiles;
  const planFile = await readIdeaFiles(body.planFile ? [body.planFile] : undefined);
  if (planFile instanceof Response) return planFile;

  return createNovelSse('novel/bible', CAST_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      const result = createProStream({
        instructions: CAST_INSTRUCTIONS,
        prompt: buildCastPrompt(
          body,
          { documentsText: ideaFiles.documentsText, pdfCount: ideaFiles.pdfParts.length },
          { documentsText: planFile.documentsText, pdfCount: planFile.pdfParts.length },
        ),
        pdfParts: [...ideaFiles.pdfParts, ...planFile.pdfParts],
        attachmentIntro: '以下附件是体系设定或创作方案，请按文件名阅读正文：',
        maxOutputTokens: NOVEL_CAST_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
      });
      await pipeTextStream(result, req.signal, send, CAST_FAILED, CAST_TRUNCATED, 'novel/bible');
    });
  });
}

/** POST /api/studio/novel/research：流式产出选题卡。 */
export async function handleNovelResearch(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parseResearchBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_RESEARCH_INPUT, 400);
  }

  const ideaFiles = await readIdeaFiles(body.ideaFiles);
  if (ideaFiles instanceof Response) return ideaFiles;
  const planFile = await readIdeaFiles(body.planFile ? [body.planFile] : undefined);
  if (planFile instanceof Response) return planFile;

  return createNovelSse('novel/research', RESEARCH_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      const result = createProStream({
        instructions: RESEARCH_INSTRUCTIONS,
        prompt: buildResearchPrompt(
          body,
          { documentsText: ideaFiles.documentsText, pdfCount: ideaFiles.pdfParts.length },
          { documentsText: planFile.documentsText, pdfCount: planFile.pdfParts.length },
        ),
        pdfParts: [...ideaFiles.pdfParts, ...planFile.pdfParts],
        attachmentIntro: '以下附件是体系设定或创作方案，请按文件名阅读正文：',
        maxOutputTokens: NOVEL_RESEARCH_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
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
  });
}
/** POST /api/studio/novel/plan：流式产出主线与分卷。 */
export async function handleNovelPlan(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parsePlanBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PLAN_INPUT, 400);
  }

  const ideaFiles = await readIdeaFiles(body.ideaFiles);
  if (ideaFiles instanceof Response) return ideaFiles;
  const planFile = await readIdeaFiles(body.planFile ? [body.planFile] : undefined);
  if (planFile instanceof Response) return planFile;

  return createNovelSse('novel/plan', PLAN_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      const result = createProStream({
        instructions: PLAN_INSTRUCTIONS,
        prompt: buildPlanPrompt(
          body,
          { documentsText: ideaFiles.documentsText, pdfCount: ideaFiles.pdfParts.length },
          { documentsText: planFile.documentsText, pdfCount: planFile.pdfParts.length },
        ),
        pdfParts: [...ideaFiles.pdfParts, ...planFile.pdfParts],
        attachmentIntro: '以下附件是体系设定或创作方案，请按文件名阅读正文：',
        maxOutputTokens: NOVEL_PLAN_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
      });
      await pipeTextStream(result, req.signal, send, PLAN_FAILED, PLAN_TRUNCATED, 'novel/plan');
    });
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

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parseVolumeChaptersBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_VOLUME_CHAPTERS_INPUT, 400);
  }

  const ideaFiles = await readIdeaFiles(body.ideaFiles);
  if (ideaFiles instanceof Response) return ideaFiles;
  const planFile = await readIdeaFiles(body.planFile ? [body.planFile] : undefined);
  if (planFile instanceof Response) return planFile;

  return createNovelSse('novel/volume-chapters', VOLUME_CHAPTERS_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      const result = createProStream({
        instructions: VOLUME_CHAPTERS_INSTRUCTIONS,
        prompt: buildVolumeChaptersPrompt(
          body,
          { documentsText: ideaFiles.documentsText, pdfCount: ideaFiles.pdfParts.length },
          { documentsText: planFile.documentsText, pdfCount: planFile.pdfParts.length },
        ),
        pdfParts: [...ideaFiles.pdfParts, ...planFile.pdfParts],
        attachmentIntro: '以下附件是体系设定或创作方案，请按文件名阅读正文：',
        maxOutputTokens: NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
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
  });
}
/** POST /api/studio/novel/writing：流式产出当前章正文。 */
export async function handleNovelWriting(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parseWritingBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_WRITING_INPUT, 400);
  }

  return createNovelSse('novel/writing', WRITING_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      if (req.signal.aborted) return;
      const result = createProStream({
        instructions: WRITING_INSTRUCTIONS,
        prompt: buildWritingPrompt(body),
        maxOutputTokens: NOVEL_WRITING_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
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
  });
}

/** POST /api/studio/novel/polish：对整篇或整章正文做通顺润色（不改情节）。 */
export async function handleNovelPolish(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const split = splitChatSettings(json);
  if (!split.ok) {
    return settingsFailResponse(split.message);
  }

  const body = parsePolishBody(split.rest);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_POLISH_INPUT, 400);
  }

  return createNovelSse('novel/polish', POLISH_FAILED, async (send) => {
    await withStudioChatSettings(split.settings, async () => {
      if (req.signal.aborted) return;
      const result = createProStream({
        instructions: POLISH_INSTRUCTIONS,
        prompt: buildPolishPrompt(body),
        maxOutputTokens: NOVEL_POLISH_MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        reasoningEffort: requestReasoningEffort(split.rest),
      });
      await pipeTextStream(
        result,
        req.signal,
        send,
        POLISH_FAILED,
        POLISH_TRUNCATED,
        'novel/polish',
      );
    });
  });
}
