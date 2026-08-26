import type { UIMessage } from 'ai';

import { parseSkillTokensInText } from '@/lib/skills/parse-tokens';

/** 规则标题已足够时跳过 LLM 的极短上限（字符数） */
const TITLE_FAST_PATH_MAX_LENGTH = 8;

type TitleParts = {
  rewritten: string;
  body: string;
  skillNames: string[];
};

/**
 * 抽取 UIMessage 中 text parts 的拼接正文。
 */
function getMessageText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .map((part) =>
      part.type === 'text' && 'text' in part && typeof part.text === 'string' ? part.text : '',
    )
    .join('');
}

/**
 * 一次解析：原文顺序替换 skill 名、抽出正文与技能列表。
 */
function parseTitleParts(text: string): TitleParts {
  const skillNames: string[] = [];
  const bodyParts: string[] = [];
  const rewrittenParts: string[] = [];

  for (const segment of parseSkillTokensInText(text)) {
    if (segment.type === 'skill') {
      if (!skillNames.includes(segment.name)) skillNames.push(segment.name);
      rewrittenParts.push(` ${segment.name} `);
      continue;
    }
    rewrittenParts.push(segment.value);
    const piece = segment.value.replace(/\s+/g, ' ').trim();
    if (piece) bodyParts.push(piece);
  }

  return {
    rewritten: rewrittenParts.join('').trim().replace(/\s+/g, ' '),
    body: bodyParts.join(' ').replace(/\s+/g, ' ').trim(),
    skillNames,
  };
}

/**
 * 取消息列表中第一条 user 消息的原文；没有则返回空串。
 */
export function getFirstUserText(messages: UIMessage[]): string {
  const firstUser = messages.find((item) => item.role === 'user');
  if (!firstUser) return '';
  return getMessageText(firstUser);
}

/**
 * 从用户首条原文推导规则标题：skill 用中文名，空白归一化，不硬截断。
 */
export function deriveHeuristicTitle(text: string): string | undefined {
  return parseTitleParts(text).rewritten || undefined;
}

/**
 * 需要 LLM 摘要时返回素材（正文在前、技能作补充）；规则标题已足够则 undefined。
 */
export function getLlmTitleSource(text: string): string | undefined {
  const { rewritten, body, skillNames } = parseTitleParts(text);
  if (!rewritten || !body || rewritten.length <= TITLE_FAST_PATH_MAX_LENGTH) {
    return undefined;
  }
  const skills = skillNames.join('、');
  return skills ? `${body}（技能：${skills}）` : body;
}
