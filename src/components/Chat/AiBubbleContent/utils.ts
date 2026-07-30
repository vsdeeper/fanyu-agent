export type MessagePart = { type: string; [key: string]: unknown };

export type SourceItem = { key: string; title: string; url: string };

export type AiBubbleContentProps = {
  text: string;
  reasoning: string;
  streaming: boolean;
  thinking: boolean;
  messageParts: ReadonlyArray<MessagePart> | undefined;
};

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

  // 3. 兜底：正文 Markdown 链接 [title](url)
  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRe.exec(text)) !== null) {
    add(match[2], match[1] || match[2]);
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
