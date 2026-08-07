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

  // 修复：Markdown 链接先于 source-url parts 执行，确保模型明确标注的标题优先生效
  // （source-url parts 的 title 可能回退为裸 URL，先执行会在 Map 中抢占位置）
  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRe.exec(text)) !== null) {
    add(match[2], match[1] || match[2]);
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
 * 不用正则精确匹配标题格式（实测模型输出 `**参考来源：**`，冒号在加粗标记内，
 * 旧正则无法匹配「先冒号后两个星号」的结尾）。改为逐行归一化后比对：
 * 去掉 markdown 标记（#、*、>、反引号）、空白、全半角冒号，剩余恰好是「参考来源」即标题行。
 * 对 `## 参考来源` / `**参考来源**` / `**参考来源：**` / `参考来源：` / `> **参考来源**` 全部生效。
 *
 * 只裁最后一个「参考来源」行及之后内容，防止正文中间误现该词时误删主文。
 */
export function stripReferenceSection(text: string): string {
  const lines = text.split('\n');
  let cutIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    // 修复：逐行归一化后比对，避免硬编码标题格式变体
    const normalized = lines[i].replace(/[#*>`\s：:]/g, '').trim();
    if (normalized === '参考来源') {
      cutIndex = i; // 取最后一个匹配
    }
  }
  if (cutIndex === -1) return text;
  return lines.slice(0, cutIndex).join('\n').trimEnd();
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
