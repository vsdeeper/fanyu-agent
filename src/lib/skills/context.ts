import type { UIMessage } from 'ai';
import { getSkill } from './registry';
import type { Skill } from './types';

/**
 * 读取用户消息上由客户端写入的 skill 集合标记（sendMessage 的 metadata.skillIds）。
 * UIMessage.metadata 默认是 unknown，需收窄后再取字段。
 */
function readMessageSkillIds(message: UIMessage): unknown {
  const metadata = message.metadata as { skillIds?: unknown } | undefined;
  return metadata?.skillIds;
}

/**
 * 从消息历史推导「最近一条定义了 metadata.skillIds 的消息」的集合。
 * - 每次发送都会写入当前激活集合（可能为 []），故集合即会话上下文、整体替换；
 * - 无任何消息定义过该字段 → 返回 null（从未启用 skill）。
 */
export function resolveActiveSkillIds(messages: UIMessage[]): string[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const skillIds = readMessageSkillIds(messages[i]);
    if (Array.isArray(skillIds)) {
      return skillIds.filter((id): id is string => typeof id === 'string');
    }
  }
  return null;
}

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
