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
import { EMPTY_ANALYSIS_DOC, REWRITE_FAILED } from './constants';
import { parseRewriteCardBody } from './parse-rewrite-card-request';
import { buildRewriteCardInstructions } from './rewrite-card-instructions';
import {
  buildRewriteCardPrompt,
  rewriteCardTemperature,
  sanitizeRewriteCardOutput,
} from './rewrite-card-prompt';

/**
 * POST /api/studio/ecommerce/rewrite-card：按草稿润色或按商业分析随机生成一卡（主图）或一屏（详情图）主题卡正文。
 */
export async function handleRewriteCard(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const body = parseRewriteCardBody(json);
  if (!body) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_FORM, 400);
  }

  const analysisText = body.analysisText.trim();
  if (!analysisText) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, EMPTY_ANALYSIS_DOC, 400);
  }

  const otherCards = body.otherCards.filter((card) => card.themeId !== body.themeId);

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
      instructions: buildRewriteCardInstructions(body.kind, body.themeId),
      prompt: buildRewriteCardPrompt({
        kind: body.kind,
        themeId: body.themeId,
        draft: body.draft,
        otherCards,
        analysisText,
        ...(body.kind === 'mainImage' ? { productDocumentsText: body.productDocumentsText } : {}),
      }),
      temperature: rewriteCardTemperature(body.draft),
      maxOutputTokens: 1024,
      abortSignal: req.signal,
      providerOptions: { openai: openaiOptions },
    });

    const requirement = sanitizeRewriteCardOutput(result.text);
    if (!requirement) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, REWRITE_FAILED, 500);
    }

    return jsonOk({ requirement });
  } catch (err) {
    if (req.signal.aborted) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, REWRITE_FAILED, 500);
    }
    console.error('[ecommerce/rewrite-card]', err);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, REWRITE_FAILED, 500);
  }
}
