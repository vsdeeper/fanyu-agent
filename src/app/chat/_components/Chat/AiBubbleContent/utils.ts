import type { SourceListItem } from '@/app/chat/_components/AuxiliaryPanel/types';
import { isHttpUrl } from '@/app/chat/_components/SourceFavicon/utils';

export type MessagePart = { type: string; [key: string]: unknown };

export type AiBubbleContentProps = {
  messageId: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type WebSearchExtra = { title?: string; snippet?: string; publishDate?: string };

/**
 * 从 tool-web_search.output.results 按 URL 抽出摘要与日期（智谱链路才有）。
 */
function collectWebSearchExtras(
  messageParts: ReadonlyArray<MessagePart> | undefined,
): Map<string, WebSearchExtra> {
  const extras = new Map<string, WebSearchExtra>();
  for (const part of messageParts ?? []) {
    if (part.type !== 'tool-web_search' || part.state !== 'output-available') continue;
    if (!isRecord(part.output) || !Array.isArray(part.output.results)) continue;
    for (const row of part.output.results) {
      if (!isRecord(row) || typeof row.link !== 'string' || !row.link) continue;
      extras.set(row.link, {
        title: typeof row.title === 'string' && row.title ? row.title : undefined,
        snippet: typeof row.content === 'string' && row.content ? row.content : undefined,
        publishDate:
          typeof row.publishDate === 'string' && row.publishDate ? row.publishDate : undefined,
      });
    }
  }
  return extras;
}

/** 把智谱检索摘要/日期合并进已去重的来源列表 */
function enrichSourceItems(
  items: SourceListItem[],
  extras: Map<string, WebSearchExtra>,
): SourceListItem[] {
  if (extras.size === 0) return items;
  return items.map((item) => {
    const extra = extras.get(item.url);
    if (!extra) return item;
    return {
      ...item,
      snippet: extra.snippet,
      publishDate: extra.publishDate,
    };
  });
}

/** 是否存在可展示的 source-url part */
function hasSourceUrlPart(messageParts: ReadonlyArray<MessagePart>): boolean {
  return messageParts.some(
    (part) => part.type === 'source-url' && typeof part.url === 'string' && part.url,
  );
}

/** 从 tool-web_search.output.results 收集列表项（桥接缺失时的兼容路径） */
function addWebSearchResultLinks(
  messageParts: ReadonlyArray<MessagePart>,
  add: (url: string, title?: string, key?: string) => void,
): void {
  for (const part of messageParts) {
    if (part.type !== 'tool-web_search' || part.state !== 'output-available') continue;
    if (!isRecord(part.output) || !Array.isArray(part.output.results)) continue;
    for (const row of part.output.results) {
      if (!isRecord(row) || typeof row.link !== 'string' || !row.link) continue;
      add(row.link, typeof row.title === 'string' ? row.title : undefined);
    }
  }
}

/**
 * 从消息 parts / 正文「参考来源」区块收集可展示来源；智谱 tool 结果按 URL 补摘要与日期。
 * 有 source-url 时不把 results 并进列表，避免拆掉桥接的域名去重。
 */
export function getSourceItems(
  messageParts: ReadonlyArray<MessagePart> | undefined,
  text: string,
): SourceListItem[] {
  if (!messageParts?.length && !text) return [];

  const byUrl = new Map<string, SourceListItem>();

  const add = (url: string, title?: string, key?: string) => {
    if (!url || !isHttpUrl(url) || byUrl.has(url)) return;
    byUrl.set(url, {
      key: key ?? url,
      title: title || url,
      url,
    });
  };

  const hasReferenceSection = findReferenceSectionStart(text) != null;
  const parts = messageParts ?? [];

  if (hasReferenceSection) {
    for (const link of extractMarkdownLinksFromReferenceSection(text)) {
      add(link.url, link.title);
    }
  } else if (hasSourceUrlPart(parts)) {
    for (const part of parts) {
      if (part.type === 'source-url' && typeof part.url === 'string') {
        add(
          part.url,
          typeof part.title === 'string' ? part.title : undefined,
          String(part.sourceId ?? part.url),
        );
      }
    }
  } else {
    addWebSearchResultLinks(parts, add);
  }

  return enrichSourceItems(Array.from(byUrl.values()), collectWebSearchExtras(messageParts));
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

/** memo 比较用：tool-save_design_md 状态与输出 */
export function designMdPartsKey(messageParts: ReadonlyArray<MessagePart> | undefined): string {
  if (!messageParts?.length) return '';

  const keys: string[] = [];
  for (const part of messageParts) {
    if (part.type === 'tool-save_design_md') {
      keys.push(`d:${String(part.state ?? '')}:${JSON.stringify(part.output ?? null)}`);
    }
  }
  return keys.join('|');
}

export function getGenerateImageParts(
  messageParts: ReadonlyArray<MessagePart> | undefined,
): MessagePart[] {
  return (messageParts ?? []).filter((part) => part.type === 'tool-generate_image');
}

export function getDesignMdParts(
  messageParts: ReadonlyArray<MessagePart> | undefined,
): MessagePart[] {
  return (messageParts ?? []).filter((part) => part.type === 'tool-save_design_md');
}

/**
 * 裁切正文末尾的「参考来源」区块。
 * 模型受 prompt 引导在回答末尾附加 Markdown 链接形式的引用列表，
 * 该区块由来源条统一展示，正文中不应重复渲染。
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
    prev.messageId === next.messageId &&
    prev.text === next.text &&
    prev.reasoning === next.reasoning &&
    prev.streaming === next.streaming &&
    prev.thinking === next.thinking &&
    sourcePartsKey(prev.messageParts) === sourcePartsKey(next.messageParts) &&
    imagePartsKey(prev.messageParts) === imagePartsKey(next.messageParts) &&
    designMdPartsKey(prev.messageParts) === designMdPartsKey(next.messageParts)
  );
}
