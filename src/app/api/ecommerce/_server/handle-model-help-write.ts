import 'server-only';

import { generateText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { analyzeImage, formatVisionAnalysisText } from '@/app/api/images/_server/vision';
import type { EcommerceModelHelpWriteData } from '@/app/api/ecommerce/_shared/types';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import {
  INVALID_JSON,
  MISSING_ANALYSIS,
  MISSING_VISUAL,
  MODEL_HELP_WRITE_FAILED,
} from './constants';
import {
  buildModelHelpWriteInstructions,
  buildModelIdentityVisionPrompt,
} from './generate-instructions';
import { parseModelHelpWriteBody } from './parse-request';

/**
 * POST /api/ecommerce/model-help-write：结合商业分析与主视觉（+ 可选模特图）生成模特要求文案。
 */
export async function handleEcommerceModelHelpWrite(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const parsed = parseModelHelpWriteBody(json);
  if (!parsed) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_VISUAL, 400);
  }

  const { analysisText, visualDataUrl, modelImageDataUrl } = parsed;
  if (!analysisText.trim()) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_ANALYSIS, 400);
  }

  const visualVision = await analyzeImage(
    visualDataUrl,
    '这是电商营销主视觉。请描述整体配色、光影方向、明暗层次、场景气质、品牌氛围与视觉风格',
    req.signal,
  );
  if (!visualVision.ok) {
    console.error('[ecommerce/model-help-write] visual analyzeImage', visualVision.error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, MODEL_HELP_WRITE_FAILED, 502);
  }

  const promptParts = [
    '【商业分析】',
    analysisText.trim(),
    '【营销主视觉识图】',
    formatVisionAnalysisText(visualVision.analysis),
  ];

  if (modelImageDataUrl) {
    const portraitVision = await analyzeImage(
      modelImageDataUrl,
      buildModelIdentityVisionPrompt(),
      req.signal,
    );
    if (portraitVision.ok) {
      promptParts.push('【模特参考图识图】', formatVisionAnalysisText(portraitVision.analysis));
    } else {
      console.error('[ecommerce/model-help-write] portrait analyzeImage', portraitVision.error);
    }
  }

  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);

  try {
    const result = await generateText({
      model: runtime.getClient().chat(getModelId(provider, 'lite')),
      instructions: buildModelHelpWriteInstructions(),
      prompt: promptParts.join('\n'),
      temperature: 0.4,
      maxOutputTokens: 768,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          reasoningEffort: getTitleReasoningEffort(provider),
        },
      },
    });
    const modelRequirement = result.text.trim();
    if (!modelRequirement) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, MODEL_HELP_WRITE_FAILED, 502);
    }
    const data: EcommerceModelHelpWriteData = { modelRequirement };
    return jsonOk(data);
  } catch (err) {
    console.error('[ecommerce/model-help-write]', err);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, MODEL_HELP_WRITE_FAILED, 502);
  }
}
