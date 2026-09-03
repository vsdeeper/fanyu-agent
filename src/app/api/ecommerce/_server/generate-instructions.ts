import 'server-only';

import { DEFAULT_MODEL_REQUIREMENT } from '@/app/api/ecommerce/_shared/constants';
import { PRODUCT_FIDELITY_PROMPT_GUARD, VISUAL_AD_PROMPT_GUARD } from './constants';

/**
 * 产品多视角出站 prompt：先建立精修产品基准，再从同一基准生成多视角视图板。
 */
export function buildProductViewPrompt(): string {
  return [
    '生成恰好一张电商产品多视角视图板，不要拆成多张图。',
    '严格按“先精修、再出多视角”的顺序执行；精修过程不单独输出图片，只输出最终视图板。',
    '【第一阶段：产品精修】',
    '保持产品外观、颜色、比例、结构完全一致；修复产品瑕疵，优化材质质感、光影、高光、阴影和边缘细节，提高商业摄影品质。',
    '背景简洁高级，突出产品主体，整体达到产品精修效果。将精修后的同一产品作为后续全部视角的唯一基准。',
    '【第二阶段：产品多视角】',
    '保持产品外观完全一致，在同一画幅内生成产品正面、侧面、背面、45度、俯视、仰视等多个角度。',
    '使用纯色背景和统一光线，各视角产品比例一致；不要添加无关道具或营销装饰。',
    PRODUCT_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 营销主视觉出站 prompt：商业分析为内容依据，产品多视角图为改图参考。
 */
export function buildVisualPrompt(analysisText: string): string {
  return [
    '生成一张电商营销主视觉图，作为后续所有设计物料的统一视觉标准。',
    '第1个参考图=已选产品多视角视图板，仅用于锁定产品外观、颜色、比例、结构与材质细节；主视觉只输出一张完整广告图。',
    '根据商业分析确定整体配色、场景、光影、构图、品牌氛围与视觉风格。',
    '画面突出产品主体，具有商业广告品质；一张图一个主焦点。',
    '【商业分析】',
    analysisText.trim(),
    PRODUCT_FIDELITY_PROMPT_GUARD,
    VISUAL_AD_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 产品模特 lookbook 拼图 prompt：主视觉定风格；有模特图则以参考图定人物特征。
 */
export function buildModelPrompt(modelRequirement: string, hasPortrait: boolean): string {
  const requirement = modelRequirement.trim();
  const portraitRule = hasPortrait
    ? '已提供模特参考图：模特特征（五官、肤色、发型、体态、气质）与模特性别以参考图为准，四格须同一参考模特。'
    : '未提供模特参考图：默认中国人模特形象（东亚面孔、自然妆发）；模特性别须与下方「模特性别」一致。';

  return [
    '生成恰好一张电商产品模特 lookbook 拼图，不要拆成多张图。',
    '整体须干净简洁：造型、妆发、场景与画面元素克制；模特旁边、身后、手里都不要有任何杂物、道具或装饰物。',
    '第1个参考图=已选营销主视觉，仅作配色、光影、品牌氛围与视觉气质参考，勿复制其场景构图；产品呈现方式按下方「模特要求」与品类判断执行。',
    '品类与产品呈现（须严格区分）：',
    '- 可穿戴品类（服装、鞋帽、箱包、配饰、首饰等须上身/穿戴展示的）：模特须穿戴产品，四格清晰展示穿着效果与版型细节。',
    '- 非可穿戴品类（家电、数码、小件、美妆瓶罐、食品等）：画面中不要出现产品本体；模特只通过造型、配色与气质贴合产品调性，禁止持用、手持、触碰、操作或演示产品。',
    portraitRule,
    '构图固定、同一画幅内拼合：左侧半身特写（胸以上、正面看镜头）；右侧三格全身站姿，从左到右为正视、侧视、背视。',
    '同一模特、同一套造型；干净无缝浅灰或白色影棚背景，背景保持空净无物，均匀柔光、少硬影；氛围与主视觉同调的专业目录感。',
    '专业电商目录气质，姿态端正、自然，便于看清版型与细节。',
    requirement ? `【模特要求】\n${requirement}` : `【模特要求】\n${DEFAULT_MODEL_REQUIREMENT}`,
  ].join('\n');
}
