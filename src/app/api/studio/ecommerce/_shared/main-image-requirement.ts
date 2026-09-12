import { formatThemePlanRequirement } from './theme-plan-requirement';

/** 主图主题卡正文格式规则，开始分析与 AI 帮写共用，结构与详情图一致。 */
export const MAIN_IMAGE_REQUIREMENT_FORMAT = `每张正文必须严格如下（不要空行堆砌）：
设计目标：……（一句）
展示重点：
- ……（1～3 条，每条单独一行、以 "- " 开头）
展示重点必须同时写清「拍什么」和「怎么拍」：画面里的产品与信息主体，加上空间类型、光线、支撑面/道具与机位构图取向。
商业分析或产品资料中出现的关键数值（如容量、风量、续航、克重）应尽量写进展示重点，供出图把数值融进画面文案；禁止编造资料里没有的数值。
「展示重点：」只出现一次，后面跟列表；禁止每条再写「展示重点：」；禁止用分号把多条挤在一行。`;

/** 主图主题卡正文样例（仅示意格式，与详情图样例刻意使用不同品类，避免两域指令样例串扰）。 */
export const MAIN_IMAGE_REQUIREMENT_SAMPLE = `设计目标：让用户第一眼记住这款 500ml 哑光不锈钢保温杯的简洁质感。
展示重点：
- 正视特写杯身整体轮廓，突出一体化杯盖与哑光金属肌理
- 保温杯立在浅灰石纹台面上，侧逆光勾出杯身高光，留白构图`;

export { formatThemePlanRequirement as formatMainImageRequirement };
