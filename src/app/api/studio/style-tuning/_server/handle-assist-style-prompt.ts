import 'server-only';

import { generateText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { INVALID_FORM, INVALID_JSON } from '@/app/api/studio/_server/constants';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import {
  ASSIST_STYLE_PROMPT_FAILED,
  MISSING_STYLE_SAMPLES,
  STYLE_TUNING_ASSIST_STYLE_PROMPT_MAX_OUTPUT_TOKENS,
} from './constants';
import { ASSIST_STYLE_PROMPT_INSTRUCTIONS } from './assist-style-prompt-instructions';
import { parseAssistStylePromptBody } from './parse-assist-style-prompt-request';

/** 清洗帮写输出：去掉首尾空白与「以下是」类前言。 */
function sanitizeAssistStylePromptOutput(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(以下是|这是|文风提示词[:：]?\s*)/i, '').trim();
  return cleaned;
}

/**
 * POST /api/studio/style-tuning/assist-style-prompt：根据文风样本提炼五维关键词式文风提示词。
 */
export async function handleAssistStylePrompt(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseAssistStylePromptBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  const styleSamples = body.styleSamples.trim();
  if (!styleSamples) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_STYLE_SAMPLES, 400);
  }

  try {
    const provider = getChatProvider();
    const runtime = getChatProviderRuntimeFor(provider);
    const capabilities = runtime.getCapabilities();
    const openaiOptions = {
      ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
      ...runtime.getOpenAIOptions(),
      reasoningEffort: getTitleReasoningEffort(provider),
    };

    const result = await generateText({
      model: runtime.getMainModel(getModelId(provider, 'lite')),
      instructions: ASSIST_STYLE_PROMPT_INSTRUCTIONS,
      prompt: `## 文风样本\n\n${styleSamples}\n\n请按 instructions 输出五行关键词式文风提示词。`,
      temperature: 0.7,
      maxOutputTokens: STYLE_TUNING_ASSIST_STYLE_PROMPT_MAX_OUTPUT_TOKENS,
      abortSignal: req.signal,
      providerOptions: { openai: openaiOptions },
    });

    const stylePrompt = sanitizeAssistStylePromptOutput(result.text);
    if (!stylePrompt) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, ASSIST_STYLE_PROMPT_FAILED, 500);
    }

    return jsonOk({ stylePrompt });
  } catch (err) {
    if (req.signal.aborted) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, ASSIST_STYLE_PROMPT_FAILED, 500);
    }
    console.error('[style-tuning/assist-style-prompt]', err);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, ASSIST_STYLE_PROMPT_FAILED, 500);
  }
}
