const FENCE_RE = /^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/;
const GOAL_RE = /^设计目标[：:]\s*(.*)$/;
const COPY_RE = /^画面文案[：:]\s*(.*)$/;
const FOCUS_RE = /^展示重点[：:]\s*(.*)$/;
const BULLET_RE = /^[-•*]\s+(.*)$/;
const MAX_COPY_ITEMS = 3;
const MAX_FOCUS_ITEMS = 3;

type ParseSection = 'none' | 'copy' | 'focus';

export type FormatThemePlanRequirementOptions = {
  /**
   * 是否保留「画面文案」节。主图默认 true；详情图传 false，旧稿文案节也会被丢弃。
   */
  includeCopy?: boolean;
};

/**
 * 把主题卡正文收成「设计目标」+ 可选「画面文案：」列表 +「展示重点：」列表。
 * 主图与详情图共用同一套标签与归一化；旧稿无「画面文案」节时仍可解析。
 */
export function formatThemePlanRequirement(
  raw: string,
  options: FormatThemePlanRequirementOptions = {},
): string {
  let text = raw.trim();
  const fenced = text.match(FENCE_RE);
  if (fenced?.[1]) text = fenced[1].trim();

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));

  return normalizeRequirementLines(lines, options.includeCopy !== false) || text;
}

/**
 * 从散乱行里抽出设计目标、画面文案与展示重点，输出固定格式。
 *
 * 带标签的节切换解析态：子弹后跟在「画面文案：」后进文案列表，跟在「展示重点：」后进拍法列表；
 * 无标签的散行仍归展示重点，兼容旧稿。
 */
function normalizeRequirementLines(lines: string[], includeCopy: boolean): string {
  let goal = '';
  const copies: string[] = [];
  const focuses: string[] = [];
  let section: ParseSection = 'none';

  for (const line of lines) {
    const goalMatch = line.match(GOAL_RE);
    if (goalMatch) {
      goal = (goalMatch[1] ?? '').trim();
      section = 'none';
      continue;
    }
    const copyMatch = line.match(COPY_RE);
    if (copyMatch) {
      section = 'copy';
      const rest = (copyMatch[1] ?? '').trim();
      if (includeCopy && rest) copies.push(...splitListItems(rest.replace(BULLET_RE, '$1')));
      continue;
    }
    const focusMatch = line.match(FOCUS_RE);
    if (focusMatch) {
      section = 'focus';
      const rest = (focusMatch[1] ?? '').trim();
      if (rest) focuses.push(...splitListItems(rest.replace(BULLET_RE, '$1')));
      continue;
    }
    const bulletMatch = line.match(BULLET_RE);
    const item = bulletMatch ? (bulletMatch[1] ?? '').trim() : line;
    if (!item) continue;
    if (section === 'copy') {
      if (includeCopy) copies.push(...splitListItems(item));
      continue;
    }
    // 无标签散行与「展示重点」子弹：一律进拍法，避免把旧稿正文误收成画面文案
    focuses.push(...splitListItems(item));
    section = 'focus';
  }

  const copyItems = includeCopy ? uniqueItems(copies).slice(0, MAX_COPY_ITEMS) : [];
  const focusItems = uniqueItems(focuses).slice(0, MAX_FOCUS_ITEMS);
  const parts: string[] = [];
  if (goal) parts.push(`设计目标：${goal}`);
  if (copyItems.length) {
    parts.push(['画面文案：', ...copyItems.map((item) => `- ${item}`)].join('\n'));
  }
  if (focusItems.length) {
    parts.push(['展示重点：', ...focusItems.map((item) => `- ${item}`)].join('\n'));
  }
  return parts.join('\n');
}

/** 按中文/英文分号切开一条列表项。 */
function splitListItems(text: string): string[] {
  return text
    .split(/[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 保序去重。 */
function uniqueItems(items: string[]): string[] {
  return [...new Set(items)];
}
