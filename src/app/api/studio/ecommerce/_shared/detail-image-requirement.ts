import { formatThemePlanRequirement } from './theme-plan-requirement';

/** 详情图主题卡正文格式规则，开始分析与 AI 帮写共用。 */
export const DETAIL_IMAGE_REQUIREMENT_FORMAT = `每屏正文必须严格如下（不要空行堆砌）：
设计目标：……（一句）
展示重点：
- ……（1～3 条，每条单独一行、以 "- " 开头）
展示重点必须同时写清「看什么」和「怎么看」：远近（特写 / 中景 / 拉远全貌）与观察角度（正视、斜侧、俯视、局部剖面等）。
「展示重点：」只出现一次，后面跟列表；禁止每条再写「展示重点：」；禁止用分号把多条挤在一行。`;

/** 详情图主题卡正文样例（仅示意格式）。 */
export const DETAIL_IMAGE_REQUIREMENT_SAMPLE = `设计目标：建立蓝白小台扇清新亲和的品类第一印象。
展示重点：
- 中景展示整机全貌，正视略抬角度，完整呈现圆润轮廓与蓝白撞色
- 风扇摆放在浅色桌面上，拍出机身的轻巧体量感和留白呼吸感
- 观察重点在机身圆角曲线与网罩圆弧的呼应关系，不做细节切入`;

export { formatThemePlanRequirement as formatDetailImageRequirement };
