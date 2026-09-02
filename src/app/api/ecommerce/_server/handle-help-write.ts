import 'server-only';

import { generateText } from 'ai';
import { z } from 'zod';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/app/api/chat/_server/providers/config';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { analyzeImage, formatVisionAnalysisText } from '@/app/api/images/_server/vision';
import type { EcommerceHelpWriteData } from '@/app/api/ecommerce/_shared/types';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import {
  DESIGN_TYPE_LABEL,
  HELP_WRITE_FAILED,
  INVALID_JSON,
  MISSING_PRODUCT_IMAGE,
  PLATFORM_LABEL,
} from './constants';

const helpWriteBodySchema = z.object({
  designType: z.enum(['main', 'detail', 'ad']),
  platform: z.string(),
  imageDataUrl: z.string().min(1),
});

const HELP_WRITE_INSTRUCTIONS = `你是电商视觉需求文案助手。根据产品识图结果，按下列要点生成拍摄/生成需求（中文简体），每个要点独占一行，供用户改动后填进需求框。
要点：产品名称、核心卖点、目标人群、投放平台、画面风格、整体氛围、文案要求。
每行格式「要点：内容」。只输出要点正文，不要标题、不要引号、不要额外解释；要点之间用单个换行分隔、逐行紧邻连续，不要空行。
「投放平台」必须是具体平台之一：淘宝/天猫、京东、拼多多、抖音、小红书，输出其中文名；禁止「智能匹配」或英文 id。若给定的目标平台为「智能匹配」，请结合产品品类推断最合适的一个。
「文案要求」仅锁定文案层级与字体编排（参考：主标题+副标题，主标题艺术字体、副标题常规字体），请以视觉设计师身份结合画面调性自由决定结构与字体；不要输出具体标题或文案内容。贴合给定的生成类型与平台话术。不要编造图中不存在的材质或功能。`;

/**
 * POST /api/ecommerce/help-write：识图后生成需求文案，写回工作台输入框。
 */
export async function handleEcommerceHelpWrite(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, INVALID_JSON, 400);
  }

  const parsed = helpWriteBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
  }

  const { designType, platform, imageDataUrl } = parsed.data;
  if (!imageDataUrl.startsWith('data:image/')) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, MISSING_PRODUCT_IMAGE, 400);
  }

  const vision = await analyzeImage(
    imageDataUrl,
    '请描述这件商品的品类、材质、颜色、形状、卖点与适合的电商画面气质',
    req.signal,
  );
  if (!vision.ok) {
    console.error('[ecommerce/help-write] analyzeImage', vision.error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, HELP_WRITE_FAILED, 502);
  }

  const typeLabel = DESIGN_TYPE_LABEL[designType] ?? designType;
  const provider = getChatProvider();
  const runtime = getChatProviderRuntimeFor(provider);

  try {
    const result = await generateText({
      model: runtime.getClient().chat(getModelId(provider, 'lite')),
      instructions: HELP_WRITE_INSTRUCTIONS,
      prompt: [
        `生成类型：${typeLabel}`,
        `目标平台：${PLATFORM_LABEL[platform] ?? platform}`,
        formatVisionAnalysisText(vision.analysis),
      ].join('\n'),
      temperature: 0.4,
      maxOutputTokens: 512,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          reasoningEffort: getTitleReasoningEffort(provider),
        },
      },
    });
    const requirement = result.text.trim();
    if (!requirement) {
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, HELP_WRITE_FAILED, 502);
    }
    const data: EcommerceHelpWriteData = { requirement };
    return jsonOk(data);
  } catch (err) {
    console.error('[ecommerce/help-write]', err);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, HELP_WRITE_FAILED, 502);
  }
}
