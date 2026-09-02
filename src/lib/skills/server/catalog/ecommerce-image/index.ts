import { ecommerceImageSummary } from '../../../summaries';
import type { Skill } from '../../../types';
import { mainChapter } from './main';
import { sharedPrefix, sharedSuffix } from './shared';

/**
 * ecommerce-image：从产品图生成电商商品图（主图 / 详情图 / 营销图）skill。
 * 复用 generate_image（i2i，主体保真）与 analyze_image（识图），形成
 * 「上传产品图 + 设计参考图 → 产品分析 → 确认 → 出 1 张主图样张 → 确认样张 →
 * 以样张为系列风格锚点输出生成清单与主图规划 → 确认 → 按规划出系列图」的对话流程；
 * 方案含视觉与出图内容营销策略（转化角色、卖点分层、套图叙事），最终仍只出图。
 * 产品图是强后端主体，靠服务端「产品图落盘桥接」跨轮引用（见 app/api/images/_server/product-assets.ts）。
 * 设计参考图是可选的风格输入，产品分析对齐其调性/色板/构图语言；样张是整组系列图的视觉定板。
 *
 * 指令正文按 sharedPrefix → mainChapter → sharedSuffix 拼接；日后加详情图时插在 main 与 suffix 之间。
 */
export const ecommerceImage: Skill = {
  ...ecommerceImageSummary,
  // 修复：关键词单命中即 0.72≥0.70 自动激活（match-intent KEYWORD_FIRST_HIT），
  // 故不用「主图/产品图/详情图」等裸泛词——会在 web-design/brandkit 等无关轮次误注入本技能指令。
  // 仅保留电商域限定词；用户仍可用 Suggestion 菜单或 /ecommerce-image 显式唤起。
  activationKeywords: [
    '电商主图',
    '电商商品图',
    '电商图',
    '商品主图',
    '淘宝主图',
    '京东主图',
    '抖音主图',
    '电商设计',
  ],
  // 声明：本 skill 产出的图片按「主图/详情图/营销图」分组展示，服务端据此在 generate_image 输出打 imageGrouping 标志
  supportsImageGrouping: true,
  instructions: `${sharedPrefix}

${mainChapter}

${sharedSuffix}`,
  samplePrompt:
    '从产品图生成电商商品主图；先识图并按格式输出产品分析；用户确认后先出 1 张主图样张供确认，再以样张为风格锚点输出生成清单与主图规划，确认后按规划出系列图；平台五选一、主图张数按平台、本轮上限 10',
};
