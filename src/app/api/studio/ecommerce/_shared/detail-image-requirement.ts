const FENCE_RE = /^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/;
const GOAL_RE = /^设计目标[：:]\s*(.*)$/;
const FOCUS_RE = /^展示重点[：:]\s*(.*)$/;
const BULLET_RE = /^[-•*]\s+(.*)$/;
const MAX_FOCUS_ITEMS = 3;

/** 详情图主题卡正文格式规则，开始分析与 AI 帮写共用。 */
export const DETAIL_IMAGE_REQUIREMENT_FORMAT = `每屏正文必须严格如下（不要空行堆砌）：
设计目标：……（一句）
展示重点：
- ……（1～3 条，每条单独一行、以 "- " 开头）
展示重点必须同时写清「看什么」和「怎么看」：远近（特写 / 中景 / 拉远全貌）与观察角度（正视、斜侧、俯视、局部剖面等）。
「展示重点：」只出现一次，后面跟列表；禁止每条再写「展示重点：」；禁止用分号把多条挤在一行。`;

/** 详情图主题卡正文样例（仅示意格式）。 */
export const DETAIL_IMAGE_REQUIREMENT_SAMPLE = `设计目标：建立蓝白小台扇清新亲和的品类第一印象。
展示重点：
- 中景展示整机全貌，正视略抬角度，完整呈现圆润轮廓与蓝白撞色
- 风扇摆放在浅色桌面上，拍出机身的轻巧体量感和留白呼吸感
- 观察重点在机身圆角曲线与网罩圆弧的呼应关系，不做细节切入`;

/**
 * 把主题卡正文收成「设计目标」一行 +「展示重点：」+ `- ` 列表。
 */
export function formatDetailImageRequirement(raw: string): string {
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
