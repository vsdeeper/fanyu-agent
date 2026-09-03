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
import { parseModelHelpWriteBody } from './parse-request';

const MODEL_HELP_WRITE_INSTRUCTIONS = `你是电商产品模特拍摄需求文案助手。根据商业分析、选中营销主视觉识图结果，以及（如有）模特参考图识图结果，生成模特拍摄/造型要求（中文简体）。

输出格式：恰好 7 行，每行「要点名：内容」，要点名必须依次为：
目标人群、模特特征、模特性别、产品穿戴、配色光影、影棚氛围、姿态拍摄
行与行之间单个换行、逐行紧邻连续，不要空行、不要标题、不要引号、不要额外解释。

规则：
- 只写拍摄/造型要求，不写具体广告文案或标题内容。
- 不编造分析/主视觉中不存在的产品功能；资料不足时据识图合理推断并点明依据。
- 整体须干净简洁：造型、妆发、场景克制；模特旁边、身后、手里都不要有任何杂物、道具或装饰物。
- 配色光影、影棚氛围须与选中主视觉同调；影棚背景为 lookbook 浅灰/白 seamless，勿复制主视觉场景构图。
- 姿态拍摄固定为：左半身特写 + 右正/侧/背全身拼图，姿态端正自然。
- 未提供模特参考图时：模特特征默认中国人形象（东亚面孔、自然妆发），年龄/体态/气质贴合目标人群与品牌调性。
- 已提供模特参考图时：模特特征、模特性别均以参考图识图结果为准，描述参考模特的五官、肤色、发型、体态与气质。
- 模特性别须明确写死为「男」或「女」，四格拼图同一性别、同一模特。
- 「产品穿戴」须据商业分析品类二选一写清：
  · 可穿戴品：说明穿戴方式、需露出的部位与搭配，生成模特穿戴展示。
  · 非可穿戴品：写明「非穿戴品，画面不出现产品，模特不持用/不触碰产品」，仅通过造型、配色与氛围贴合调性。`;

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
      '这是模特参考图。请描述模特的性别、年龄段、五官、肤色、发型、体态、气质与整体形象',
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
      instructions: MODEL_HELP_WRITE_INSTRUCTIONS,
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
