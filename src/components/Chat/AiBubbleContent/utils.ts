export type MessagePart = { type: string; [key: string]: unknown };

export type SourceItem = { key: string; title: string; url: string };

export type AiBubbleContentProps = {
  text: string;
  reasoning: string;
  streaming: boolean;
  thinking: boolean;
  messageParts: ReadonlyArray<MessagePart> | undefined;
};

/** 「参考来源」标题在正文中的起始位置（取最后一个匹配） */
type ReferenceSectionStart = { lineIndex: number; col: number };

const MD_LINK_LINE_RE = /^\s*(?:[-*]|\d+\.)?\s*\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/;

/**
 * 定位全文最后一个「参考来源」标题的起始位置。
 * 与 stripReferenceSection 共用同一套标题识别规则。
 */
function findReferenceSectionStart(text: string): ReferenceSectionStart | null {
  const lines = text.split('\n');
  let cutIndex = -1;
  let cutCol = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = line.replace(/[#*>`\s：:]/g, '').trim();
    if (normalized === '参考来源') {
      cutIndex = i;
      cutCol = 0;
      continue;
    }
    const trailing = /[*#>`_\s]*参考来源[*#>`_：:\s]*$/.exec(line);
    if (trailing && trailing.index != null) {
      cutIndex = i;
      cutCol = trailing.index;
    }
  }

  if (cutIndex === -1) return null;
  return { lineIndex: cutIndex, col: cutCol };
}

/**
 * 从「参考来源」标题之后抽取连续 Markdown 链接行（空行可跳过，遇非链接正文即停）。
 */
function extractMarkdownLinksFromReferenceSection(
  text: string,
): Array<{ title: string; url: string }> {
  const start = findReferenceSectionStart(text);
  if (!start) return [];

  const lines = text.split('\n');
  const links: Array<{ title: string; url: string }> = [];

  for (let i = start.lineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = MD_LINK_LINE_RE.exec(line);
    if (!match) break;

    links.push({ title: match[1] || match[2], url: match[2] });
  }

  return links;
}

export function getSourceItems(
  messageParts: ReadonlyArray<MessagePart> | undefined,
  text: string,
): SourceItem[] {
  if (!messageParts?.length && !text) return [];

  const byUrl = new Map<string, SourceItem>();

  const add = (url: string, title?: string, key?: string) => {
    if (!url || byUrl.has(url)) return;
    byUrl.set(url, {
      key: key ?? url,
      title: title || url,
      url,
    });
  };

  const hasReferenceSection = findReferenceSectionStart(text) != null;

  if (hasReferenceSection) {
    for (const link of extractMarkdownLinksFromReferenceSection(text)) {
      add(link.url, link.title);
    }
    return Array.from(byUrl.values());
  }

  for (const part of messageParts ?? []) {
    // 1. AI SDK source-url（后端 SSE 注入 annotation.added 后的主路径）
    if (part.type === 'source-url' && typeof part.url === 'string') {
      add(
        part.url,
        typeof part.title === 'string' ? part.title : undefined,
        String(part.sourceId ?? part.url),
      );
      continue;
    }

    // 2. tool-web_search.output.sources（偶发 / 兼容）
    if (part.type === 'tool-web_search' && part.state === 'output-available') {
      const output = part.output as
        { sources?: Array<{ type?: string; url?: string; title?: string }> } | undefined;
      for (const source of output?.sources ?? []) {
        if (source.url) {
          add(source.url, source.title);
        }
      }
    }
  }

  return Array.from(byUrl.values());
}

/** memo 比较用：仅序列化 parts 中的引用相关字段，不扫描正文 Markdown */
export function sourcePartsKey(messageParts: ReadonlyArray<MessagePart> | undefined): string {
  if (!messageParts?.length) return '';

  const keys: string[] = [];
  for (const part of messageParts) {
    if (part.type === 'source-url' && typeof part.url === 'string') {
      keys.push(`u:${String(part.sourceId ?? part.url)}:${part.url}`);
    }
    if (part.type === 'tool-web_search') {
      keys.push(`w:${String(part.state ?? '')}:${JSON.stringify(part.output ?? null)}`);
    }
  }
  return keys.join('|');
}

/** memo 比较用：tool-generate_image 状态与输出 */
export function imagePartsKey(messageParts: ReadonlyArray<MessagePart> | undefined): string {
  if (!messageParts?.length) return '';

  const keys: string[] = [];
  for (const part of messageParts) {
    if (part.type === 'tool-generate_image') {
      keys.push(`g:${String(part.state ?? '')}:${JSON.stringify(part.output ?? null)}`);
    }
  }
  return keys.join('|');
}

export function getGenerateImageParts(
  messageParts: ReadonlyArray<MessagePart> | undefined,
): MessagePart[] {
  return (messageParts ?? []).filter((part) => part.type === 'tool-generate_image');
}

export function openSourceUrl(item: { url?: string }) {
  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
}

/**
 * 裁切正文末尾的「参考来源」区块。
 * 模型受 prompt 引导在回答末尾附加 Markdown 链接形式的引用列表，
 * 该区块由 Sources 组件统一展示，正文中不应重复渲染。
 *
 * 不用正则精确匹配标题格式（实测模型输出 `**参考来源：**`，冒号在加粗标记内）。
 * 整行归一化后恰好是「参考来源」，或标题粘在行尾（如「尽量减少**参考来源：**」），都从该处切开。
 * 只裁最后一个标题及之后内容，防止正文中间误现该词时误删主文。
 */
export function stripReferenceSection(text: string): string {
  const start = findReferenceSectionStart(text);
  if (!start) return text;

  const lines = text.split('\n');
  const kept = lines.slice(0, start.lineIndex);
  const prefix = lines[start.lineIndex]
    .slice(0, start.col)
    .replace(/[\s\-*>#]+$/u, '')
    .trimEnd();
  if (prefix) kept.push(prefix);
  return kept.join('\n').trimEnd();
}

export function aiBubbleContentPropsAreEqual(
  prev: AiBubbleContentProps,
  next: AiBubbleContentProps,
): boolean {
  return (
    prev.text === next.text &&
    prev.reasoning === next.reasoning &&
    prev.streaming === next.streaming &&
    prev.thinking === next.thinking &&
    sourcePartsKey(prev.messageParts) === sourcePartsKey(next.messageParts) &&
    imagePartsKey(prev.messageParts) === imagePartsKey(next.messageParts)
  );
}
