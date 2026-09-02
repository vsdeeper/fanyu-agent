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
import { HELP_WRITE_FAILED, INVALID_JSON, MISSING_PRODUCT_IMAGE } from './constants';

const DESIGN_TYPE_LABEL: Record<string, string> = {
  main: '主图',
  detail: '详情图',
  ad: '广告图',
};

const helpWriteBodySchema = z.object({
  designType: z.enum(['main', 'detail', 'ad']),
  platform: z.string(),
  imageDataUrl: z.string().min(1),
});

const HELP_WRITE_INSTRUCTIONS = `你是电商视觉需求文案助手。根据产品识图结果，写一段简短的拍摄/生成需求（中文简体，80～180 字），供用户填进需求框。
只输出需求正文，不要标题、不要引号、不要分点清单。写明：产品是什么、核心卖点、目标人群、画面风格与氛围；贴合给定的生成类型与平台话术。不要编造图中不存在的材质或功能。`;

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
        `目标平台：${platform}`,
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
