import 'server-only';

import type { UIMessage } from 'ai';
import { resolveActiveSkillIds } from '../context';
import type { Skill } from '../types';
import { getSkill } from './registry';

/**
 * 把消息历史上粘滞的 skillIds 解析为完整 Skill（跳过已删除/不存在的项）。
 * 仅用于需要 Skill 对象的内部场景；本轮是否注入 instructions 以 resolveTurnSkills 为准。
 */
export function resolveActiveSkills(messages: UIMessage[]): Skill[] {
  const ids = resolveActiveSkillIds(messages);
  if (!ids) return [];
  const skills: Skill[] = [];
  for (const id of ids) {
    const skill = getSkill(id);
    if (skill) skills.push(skill);
  }
  return skills;
}
