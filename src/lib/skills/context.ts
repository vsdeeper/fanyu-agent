import type { UIMessage } from 'ai';

/**
 * 读取用户消息上的 skill 集合标记（客户端发送或服务端合并后的 metadata.skillIds）。
 * UIMessage.metadata 默认是 unknown，需收窄后再取字段。
 */
function readMessageSkillIds(message: UIMessage): unknown {
  const metadata = message.metadata as { skillIds?: unknown } | undefined;
  return metadata?.skillIds;
}

/**
 * 读取单条消息上已定义的 skillIds；未定义或非数组时返回空数组。
 */
export function getMessageSkillIds(message: UIMessage): string[] {
  const skillIds = readMessageSkillIds(message);
  if (!Array.isArray(skillIds)) return [];
  return skillIds.filter((id): id is string => typeof id === 'string');
}

/**
 * 从消息历史推导「最近一条定义了 metadata.skillIds 的消息」的集合。
 * 服务端每轮只增不减地合并后落盘，故该集合即会话粘滞记录（不等于本轮 Activation）。
 * 无任何消息定义过该字段 → 返回 null（从未启用 skill）。
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
