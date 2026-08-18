import { getSkill } from './registry';

// 与 expand.ts 同一套边界规则：行首或空格后的 /id
const SKILL_TOKEN_RE = /(^|\s)\/([a-z0-9-]*)/g;

export type SkillTextSegment =
  { type: 'text'; value: string } | { type: 'skill'; id: string; name: string; icon?: string };

/**
 * 把用户文本按 /skill 令牌切分为普通文本与已知 skill 段，供气泡内 tag 展示。
 * 注册表不存在的 id 保留为原文，不单独成段。
 */
export function parseSkillTokensInText(text: string): SkillTextSegment[] {
  if (!text) return [];

  const segments: SkillTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SKILL_TOKEN_RE)) {
    const boundary = match[1] ?? '';
    const id = match[2] ?? '';
    const matchStart = match.index ?? 0;
    const slashPos = matchStart + boundary.length;
    const tokenEnd = slashPos + 1 + id.length;
    const skill = id.length > 0 ? getSkill(id) : undefined;

    if (matchStart > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, matchStart) });
    }

    if (skill) {
      if (boundary) {
        const last = segments[segments.length - 1];
        if (last?.type === 'text') {
          last.value += boundary;
        } else {
          segments.push({ type: 'text', value: boundary });
        }
      }
      segments.push({
        type: 'skill',
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
      });
      lastIndex = tokenEnd;
    } else {
      segments.push({ type: 'text', value: text.slice(matchStart, tokenEnd) });
      lastIndex = tokenEnd;
    }
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
