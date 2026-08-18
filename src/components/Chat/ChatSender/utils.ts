import type { SuggestionItem } from '@ant-design/x/es/suggestion';
import { getSkill } from '@/lib/skills/registry';
import type { SkillSummary } from '@/lib/skills/types';

/** 把 skill 精简视图映射为 Suggestion 菜单项（label=图标+名称，extra=描述） */
export function toSkillSuggestionItems(summaries: SkillSummary[]): SuggestionItem[] {
  return summaries.map(({ id, name, description, icon }) => ({
    value: id,
    label: icon ? `${icon} ${name}` : name,
    extra: description,
  }));
}

/**
 * 是否含「可唤起菜单」的 / 令牌：行首或空格后的 /（前面紧贴普通文字的 / 不算）。
 * 修复：已补全的完整 skill 令牌（id 在注册表存在且后接空白/结尾）不再触发，否则选中后
 * 输入里残留的边界 / 会在下一次敲键时立刻重新弹菜单。与 expand.ts 的展开规则一致。
 */
export function hasSkillToken(value: string): boolean {
  for (const match of value.matchAll(/(^|\s)\/([a-z0-9-]*)/g)) {
    const id = match[2] ?? '';
    const tokenEnd = (match.index ?? 0) + match[0].length;
    const next = value[tokenEnd];
    if (id.length > 0 && getSkill(id) && (!next || /\s/.test(next))) {
      continue;
    }
    return true;
  }
  return false;
}

// 修复：id 用 [a-z0-9-]* 而非 [^\s]*，避免把令牌后紧跟的中文/标点吞进 id（如「/brandkit用暖色」只匹配 /brandkit）。
const SKILL_TOKEN_RE = /(^|\s)\/([a-z0-9-]*)/g;

/**
 * 把最后一个「行首或空格后」的 /xxx 令牌补全为 /<skillId>。
 * - 保证令牌两侧与普通内容至少一个空格：前侧由 (^|\s) 边界自然保证（before 原样保留用户空格），
 *   后侧紧邻非空白则补一个空格；
 * - 不折叠多余空格，用户已有空格/多空格原样保留；
 * - 补全后令牌仍是 (^|\s)\/ 边界形式，可再次被 / 菜单识别追加。
 * 说明：定位的是最后一个边界令牌（用户通常是追加式输入）。
 */
export function completeSkillToken(input: string, skillId: string): string {
  const matches = [...input.matchAll(SKILL_TOKEN_RE)];
  if (matches.length === 0) {
    // 兜底：输入里没有边界 / 令牌（正常不会发生，onSelect 只在菜单打开时触发）
    return `${input} /${skillId} `;
  }
  const last = matches[matches.length - 1];
  const boundary = last[1] ?? '';
  const idChars = last[2] ?? '';
  const slashPos = (last.index ?? 0) + boundary.length;
  const tokenEnd = slashPos + 1 + idChars.length;

  const before = input.slice(0, last.index ?? 0);
  const afterRaw = input.slice(tokenEnd);
  const after = afterRaw && !/^\s/.test(afterRaw) ? ` ${afterRaw}` : afterRaw;

  return `${before}${boundary}/${skillId}${after}`;
}

/**
 * Sender.Header 延后挂载：无外部 store，subscribe 为空。
 * 配合 useSyncExternalStore，hydrate 后从服务端 snapshot 切到客户端 snapshot。
 */
export function subscribeSenderHeaderReady(): () => void {
  return () => {};
}

/** 客户端 snapshot：hydrate 完成后挂 Header */
export function getSenderHeaderReady(): boolean {
  return true;
}

/** 服务端 snapshot：SSR / hydrate 首帧不挂 Header，避免 CSSMotion forceRender 错位 */
export function getSenderHeaderReadyServer(): boolean {
  return false;
}
