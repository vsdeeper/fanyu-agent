import type { SkillSummary } from './types';

/** brandkit 菜单摘要；指令正文只存在 server catalog，避免打进浏览器包 */
export const brandkitSummary: SkillSummary = {
  id: 'brandkit',
  name: '品牌规范板',
  description: '生成高端品牌视觉规范板：标志系统、版式、暗色科技 / 奢侈 / 文化风',
};

const SKILL_SUMMARIES: SkillSummary[] = [brandkitSummary];

/** 全部 skill 的精简视图（不含指令正文，供前端 Suggestion 菜单） */
export function listSkillSummaries(): SkillSummary[] {
  return SKILL_SUMMARIES;
}

/** 按 id 查 skill 摘要；不存在返回 undefined（气泡令牌解析按「未知」保留原文） */
export function getSkillSummary(id: string): SkillSummary | undefined {
  return SKILL_SUMMARIES.find((skill) => skill.id === id);
}
