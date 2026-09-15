import { formatThemePlanRequirement } from './theme-plan-requirement';

/** 详情图主题卡正文格式规则，开始分析与 AI 帮写共用；不定死上图文案。 */
export const DETAIL_IMAGE_REQUIREMENT_FORMAT = `每屏正文必须严格如下（不要空行堆砌）：
设计目标：……（一句，策划意图，不上图）
展示重点：
- ……（1～3 条，每条单独一行、以 "- " 开头）
禁止输出「画面文案」节或任何定死的上图短句；上图用字留给出图环节按设计目标转化。
展示重点必须同时写清「看什么」和「怎么看」：远近（特写 / 中景 / 拉远全貌）与观察角度（正视、斜侧、俯视、局部剖面等）。
「展示重点：」只出现一次，后面跟列表；禁止每条再写标签；禁止用分号把多条挤在一行。`;

/** 详情图主题卡正文样例（仅示意格式）。 */
export const DETAIL_IMAGE_REQUIREMENT_SAMPLE = `设计目标：建立蓝白小台扇清新亲和的品类第一印象。
展示重点：
- 中景展示整机全貌，正视略抬角度，完整呈现圆润轮廓与蓝白撞色
- 风扇置于清新居家的品牌场景中，背景以质感墙面与浅色陈设铺陈，交代品牌气质与体量感
- 观察重点在机身圆角曲线与网罩圆弧的呼应关系，不做细节切入`;

/**
 * 收成设计目标 + 展示重点；旧稿若含「画面文案」节则丢弃，不写回正文。
 */
export function formatDetailImageRequirement(raw: string): string {
  return formatThemePlanRequirement(raw, { includeCopy: false });
}
