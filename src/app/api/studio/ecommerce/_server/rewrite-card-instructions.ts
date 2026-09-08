import 'server-only';

import {
  DETAIL_IMAGE_THEMES,
  type DetailImageThemeId,
} from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import {
  DETAIL_IMAGE_REQUIREMENT_FORMAT,
  DETAIL_IMAGE_REQUIREMENT_SAMPLE,
} from '@/app/api/studio/ecommerce/_shared/detail-image-requirement';

/** 各屏职责：与详情图分析指令中对应节一致，只注入当前屏。 */
export const DETAIL_IMAGE_THEME_DUTIES: Record<DetailImageThemeId, string> = {
  brand:
    '建立品牌第一印象：定位、气质与可识别符号。中景或半身级产品全貌，不要特写局部，不得写成卖点清单或使用现场。',
  sellingPoint:
    '1 个主主张 + 最多 2 条同簇辅点。禁止把分析里全部卖点平铺进来。机位须能把该主张看清，可斜侧或微距，不得复用「品牌认知」的定位口号与同一正视全身。',
  detail:
    '材质、工艺、结构或外观特写。必须近景/局部特写，并换一个不同于前两屏的观察角度。不得写成功能机制演示，也不得复用核心卖点的主主张。',
  feature:
    '看见机制如何发生（结构、操作、效果）。主机制不得与「核心卖点」的主主张相同；机位须能看见机制发生（操作角度、出风/结构开口等），不得停在静物正视特写。',
  scene:
    '真实使用现场与情境。必须拉远，产品按使用比例出现在现场中，不得是静物台或纯特写，不得复用前四屏的信息点。',
  reason:
    '收束购买动机与体验结果。不得再罗列功能参数，不得与「使用场景」写成同一现场；产品占比与机位须与前五屏均不同。',
};

const REWRITE_CARD_BASE_INSTRUCTIONS = `你是电商详情页结构策划。只写当前这一屏的设计目标与展示重点。使用中文简体。

硬性规则：
- 禁止询问、禁止确认门、禁止请用户补充后再写；资料不足时按商业分析合理收束。
- 禁止调用工具、禁止出图、禁止输出图片链接。
- 不要输出 JSON、代码围栏、表格、引用块、二级标题；不要输出其它屏。
- 不要输出商业分析原文，不要把卖点清单整段抄进来。
- 主题卡不要写色板、字体、Logo 位置；那些由商业分析在出图时决定。
- 禁止与其它屏重复同一卖点、同一细节、同一场景、同一机位。

只输出当前屏正文。
${DETAIL_IMAGE_REQUIREMENT_FORMAT}

格式样例（仅示意结构，内容须按本屏职责与商业分析重写）：
${DETAIL_IMAGE_REQUIREMENT_SAMPLE}

禁止说明书式参数罗列与广告套话。`;

/** 按 themeId 取详情图主题中文标题 */
export function detailThemeTitle(themeId: DetailImageThemeId): string {
  return DETAIL_IMAGE_THEMES.find((theme) => theme.id === themeId)?.title ?? themeId;
}

/**
 * 组装只写当前屏的帮写 instructions，含该屏职责。
 */
export function buildRewriteCardInstructions(themeId: DetailImageThemeId): string {
  return [
    REWRITE_CARD_BASE_INSTRUCTIONS,
    `当前屏标题：${detailThemeTitle(themeId)}`,
    `本屏职责：${DETAIL_IMAGE_THEME_DUTIES[themeId]}`,
  ].join('\n');
}
