import type { Skill, SkillSummary } from './types';
import { brandkit } from './brandkit';

// 新增 skill：复制 _template.ts 为 <id>.ts 填写（完整示例见 brandkit.ts），再在 SKILLS 数组 import 追加。
const SKILLS: Skill[] = [brandkit];

/** 全部 skill 定义（含指令正文，供服务端注入） */
export function listSkills(): Skill[] {
  return SKILLS;
}

/** 全部 skill 的精简视图（不含指令正文，供前端 Suggestion 菜单） */
export function listSkillSummaries(): SkillSummary[] {
  return SKILLS.map(({ id, name, description, icon }) => ({ id, name, description, icon }));
}

/** 按 id 查 skill；不存在返回 undefined（调用方按「未启用」优雅降级） */
export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
