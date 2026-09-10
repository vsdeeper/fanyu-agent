const FENCE_RE = /^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/;
const GOAL_RE = /^设计目标[：:]\s*(.*)$/;
const FOCUS_RE = /^展示重点[：:]\s*(.*)$/;
const BULLET_RE = /^[-•*]\s+(.*)$/;
const MAX_FOCUS_ITEMS = 3;

/**
 * 把主题卡正文收成「设计目标」一行 +「展示重点：」+ `- ` 列表。
 * 「设计目标 + 展示重点」为主图与详情图主题卡共用的正文格式，标签行两侧一致，归一化逻辑同源。
 */
export function formatThemePlanRequirement(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(FENCE_RE);
  if (fenced?.[1]) text = fenced[1].trim();

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));

  return normalizeRequirementLines(lines) || text;
}

/**
 * 从散乱行里抽出设计目标与展示重点条目，输出固定格式。
 */
function normalizeRequirementLines(lines: string[]): string {
  let goal = '';
  const focuses: string[] = [];

  for (const line of lines) {
    const goalMatch = line.match(GOAL_RE);
    if (goalMatch) {
      goal = (goalMatch[1] ?? '').trim();
      continue;
    }
    const focusMatch = line.match(FOCUS_RE);
    if (focusMatch) {
      const rest = (focusMatch[1] ?? '').trim();
      if (rest) focuses.push(...splitFocusItems(rest.replace(BULLET_RE, '$1')));
      continue;
    }
    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      const item = (bulletMatch[1] ?? '').trim();
      if (item) focuses.push(...splitFocusItems(item));
      continue;
    }
    focuses.push(...splitFocusItems(line));
  }

  const items = uniqueItems(focuses).slice(0, MAX_FOCUS_ITEMS);
  const parts: string[] = [];
  if (goal) parts.push(`设计目标：${goal}`);
  if (items.length) parts.push(['展示重点：', ...items.map((item) => `- ${item}`)].join('\n'));
  return parts.join('\n');
}

/** 按中文/英文分号切开一条展示重点。 */
function splitFocusItems(text: string): string[] {
  return text
    .split(/[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 保序去重。 */
function uniqueItems(items: string[]): string[] {
  return [...new Set(items)];
}
