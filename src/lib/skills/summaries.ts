import type { SkillSummary } from './types';

/** brandkit 菜单摘要；指令正文只存在 server catalog，避免打进浏览器包 */
export const brandkitSummary: SkillSummary = {
  id: 'brandkit',
  name: '品牌规范板',
  description:
    '生成高端品牌视觉规范板：标志系统、版式、暗色科技 / 奢侈 / 文化风；规范板交付后可按需输出商店用 App Icon 与反转 App Icon。适用于品牌 VI、logo 规范、品牌识别与品牌板',
};

/** mobile-design 菜单摘要；指令正文只存在 server catalog，避免打进浏览器包 */
export const mobileDesignSummary: SkillSummary = {
  id: 'mobile-design',
  name: '移动端设计',
  description:
    '生成高端移动端 App 界面概念图：单屏 / 引导 / 多屏流程，iOS / Android / 跨平台。适用于手机 App、移动应用界面与多屏流程设计',
};

/** web-design 菜单摘要；指令正文只存在 server catalog，避免打进浏览器包 */
export const webDesignSummary: SkillSummary = {
  id: 'web-design',
  name: 'Web 端设计',
  description:
    '生成高端网站/落地页设计参考图：一区块一图，Hero / 功能 / 证言 / CTA 等横向构图。适用于官网、营销站、landing page 与 Web 端设计',
};

/** design-md 知识库摘要：不进菜单，用户不可 /id 调用；指令正文只存在 server catalog */
export const designMdSummary: SkillSummary = {
  id: 'design-md',
  name: '设计系统文档',
  description:
    '按产品意图与已出界面设计图，按需落盘语义化 DESIGN.md 并提供下载（氛围、色板、字阶、组件、布局、动效与反模式），供后续实现对齐。不直接出图、不在对话中贴全文',
  userInvocable: false,
};

/** ecommerce-image 菜单摘要；指令正文只存在 server catalog，避免打进浏览器包 */
export const ecommerceImageSummary: SkillSummary = {
  id: 'ecommerce-image',
  name: '电商设计',
  description:
    '从产品图生成电商商品图：主图 / 详情图 / 营销图；先识图并输出产品分析、生成清单与主图规划，再锁定目标平台后出图。适用于淘宝/天猫、京东、拼多多、抖音、小红书',
};

// 隐藏菜单：在对应 Summary 上设 userInvocable: false（默认省略即为可调用）

const SKILL_SUMMARIES: SkillSummary[] = [
  ecommerceImageSummary,
  brandkitSummary,
  mobileDesignSummary,
  webDesignSummary,
  designMdSummary,
];

/** 用户可从菜单或 /<id> 令牌调用（userInvocable !== false） */
export function isSkillUserInvocable(skill: Pick<SkillSummary, 'userInvocable'>): boolean {
  return skill.userInvocable !== false;
}

/** 用户可在界面调用的 skill（userInvocable !== false）；供 Suggestion 菜单 */
export function listSkillSummaries(): SkillSummary[] {
  return SKILL_SUMMARIES.filter(isSkillUserInvocable);
}

/** 按 id 查 skill 摘要（含不可调用项）；不存在返回 undefined（气泡令牌解析按「未知」保留原文） */
export function getSkillSummary(id: string): SkillSummary | undefined {
  return SKILL_SUMMARIES.find((skill) => skill.id === id);
}
