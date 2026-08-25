import 'server-only';

import type { UIMessage } from 'ai';

import { getMessageSkillIds, resolveActiveSkillIds } from '../context';
import { parseSkillTokensInText } from '../parse-tokens';
import type { Skill } from '../types';
import { matchSkillsByIntent, type SkillMatchResult } from './match-intent';
import { getSkill, listSkills } from './registry';

export type ResolveTurnSkillsResult = {
  manualTokenIds: string[];
  autoIds: string[];
  turnActivatedIds: string[];
  turnActivatedSkills: Skill[];
  mergedSkillIds: string[];
  matches: SkillMatchResult[];
};

/**
 * 按注册表顺序去重拼接 id；跳过未知 skill。
 */
function uniqueKnownIds(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const id of list) {
      if (seen.has(id) || !getSkill(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * 将声明了 coActivateWith 的知识库 skill 并入本轮激活集合。
 * 任一伴随目标已在 activatedIds 中即注入，便于出图 skill 激活时带上 DESIGN.md 写作规范。
 */
function appendCompanionIds(activatedIds: string[]): string[] {
  if (activatedIds.length === 0) return activatedIds;
  const activated = new Set(activatedIds);
  const companions = listSkills()
    .filter((skill) => skill.coActivateWith?.some((id) => activated.has(id)))
    .map((skill) => skill.id);
  return uniqueKnownIds(activatedIds, companions);
}

/** 抽取 UIMessage 文本 part */
function getUserText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && 'text' in part && typeof part.text === 'string')
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

function findLastUserIndex(messages: UIMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return i;
  }
  return -1;
}

const EMPTY_TURN: ResolveTurnSkillsResult = {
  manualTokenIds: [],
  autoIds: [],
  turnActivatedIds: [],
  turnActivatedSkills: [],
  mergedSkillIds: [],
  matches: [],
};

/**
 * 解析本轮 skill：手动 /token、达阈值的自动匹配、伴随激活、会话粘滞 metadata。
 * - turnActivated：仅本轮注入完整 instructions（手动 ∪ 自动 ∪ coActivateWith）
 * - mergedSkillIds：只增不减的粘滞记录，不等于每轮注入正文
 */
export function resolveTurnSkills(
  messages: UIMessage[],
  options?: { log?: boolean },
): ResolveTurnSkillsResult {
  const lastUserIndex = findLastUserIndex(messages);
  if (lastUserIndex < 0) return EMPTY_TURN;

  const lastUser = messages[lastUserIndex];
  if (!lastUser) return EMPTY_TURN;

  const previous = messages.slice(0, lastUserIndex);
  const historySticky = resolveActiveSkillIds(previous) ?? [];
  const clientIds = getMessageSkillIds(lastUser);
  const stickyForMatch = uniqueKnownIds(historySticky, clientIds);

  const text = getUserText(lastUser).trim();
  const manualTokenIds = uniqueKnownIds(
    parseSkillTokensInText(text)
      .filter((segment) => segment.type === 'skill')
      .map((segment) => segment.id),
  );

  const matches = text
    ? matchSkillsByIntent(text, stickyForMatch, { log: options?.log ?? true })
    : [];
  const autoIds = uniqueKnownIds(
    matches.filter((match) => match.activated).map((match) => match.id),
  );

  const turnActivatedIds = appendCompanionIds(uniqueKnownIds(manualTokenIds, autoIds));
  const turnActivatedSkills = turnActivatedIds.flatMap((id) => {
    const skill = getSkill(id);
    return skill ? [skill] : [];
  });
  const mergedSkillIds = uniqueKnownIds(historySticky, clientIds, turnActivatedIds);

  return {
    manualTokenIds,
    autoIds,
    turnActivatedIds,
    turnActivatedSkills,
    mergedSkillIds,
    matches,
  };
}
