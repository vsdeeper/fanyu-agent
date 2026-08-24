import 'server-only';

import type { UIMessage } from 'ai';
import { resolveActiveSkillIds } from '../context';
import type { Skill } from '../types';
import { getSkill } from './registry';

/** 从消息历史推导当前生效的 skill 集合（跳过已删除/不存在的 skill，优雅降级） */
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
