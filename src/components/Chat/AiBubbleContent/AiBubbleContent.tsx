'use client';

import { memo, type ReactNode, useMemo, useState } from 'react';
import { Sources, Think } from '@ant-design/x';
import { XMarkdown, type ComponentProps } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import { GlobalOutlined } from '@ant-design/icons';
import { Image, Skeleton } from 'antd';
import styles from './AiBubbleContent.module.css';

type MessagePart = { type: string; [key: string]: unknown };

type SourceItem = { key: string; title: string; url: string };

export type AiBubbleContentProps = {
  text: string;
  reasoning: string;
  streaming: boolean;
  thinking: boolean;
  messageParts: ReadonlyArray<MessagePart> | undefined;
};

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** 用域名推导 favicon（ico.n3v.cn；模型不返回图标 URL） */
function SourceFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const host = getHostname(url)?.replace(/^www\./, '') ?? null;

  if (!host || failed) {
    return <GlobalOutlined className={styles.sourceFaviconFallback} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 第三方 favicon 服务，无需 next/image
    <img
      className={styles.sourceFavicon}
      src={`https://ico.n3v.cn/get.php?url=${encodeURIComponent(host)}`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
    />
  );
}

function getSourceItems(
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

type GenerateImageOutput = {
  ok?: boolean;
  assetId?: string;
  url?: string;
  error?: string;
};

function GenerateImageItem({ part }: { part: MessagePart }) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as GenerateImageOutput | undefined;

  if (state === 'output-error' || output?.ok === false) {
    return (
      <Image
        classNames={{ root: styles.generateImage }}
        src=""
        alt="图片生成失败"
        preview={false}
      />
    );
  }

  if (output?.ok === true && output.assetId) {
    const src = output.url || `/api/images/${output.assetId}`;
    return (
      <Image
        classNames={{ root: styles.generateImage }}
        src={src}
        alt="生成的图片"
        preview={{ mask: '预览' }}
      />
    );
  }

  if (
    state === 'input-streaming' ||
    state === 'input-available' ||
    state === 'approval-requested'
  ) {
    return <Skeleton.Image active classNames={{ root: styles.generateImage }} />;
  }

  return null;
}

function GenerateImageBlock({ parts }: { parts: ReadonlyArray<MessagePart> }) {
  return (
    <div className={styles.generateImageList}>
      <Image.PreviewGroup>
        {parts.map((part, index) => (
          <GenerateImageItem key={`generate-image-${index}`} part={part} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}

function MarkdownImage(props: ComponentProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : '';

  if (!src) return null;

  return (
    <Image
      classNames={{ root: styles.markdownImage }}
      src={src}
      alt={alt}
      preview={{ mask: '预览' }}
    />
  );
}

function ImageSkeleton() {
  return <Skeleton.Image active classNames={{ root: styles.markdownImageSkeleton }} />;
}

const markdownComponents = {
  img: MarkdownImage,
  'incomplete-image': ImageSkeleton,
};

function openSourceUrl(item: { url?: string }) {
  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
}

function ReasoningThink({ thinking, children }: { thinking: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(thinking);
  const [prevThinking, setPrevThinking] = useState(thinking);

  if (thinking !== prevThinking) {
    setPrevThinking(thinking);
    setExpanded(thinking);
  }

  return (
    <Think
      className={styles.think}
      title={thinking ? '思考中' : '思考过程'}
      loading={thinking}
      blink={thinking}
      expanded={expanded}
      onExpand={setExpanded}
    >
      {children}
    </Think>
  );
}

function aiBubbleContentPropsAreEqual(
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

function AiBubbleContent({
  text,
  reasoning,
  streaming,
  thinking,
  messageParts,
}: AiBubbleContentProps) {
  const sourceItems = useMemo(() => getSourceItems(messageParts, text), [messageParts, text]);
  const imageParts = useMemo(
    () => (messageParts ?? []).filter((part) => part.type === 'tool-generate_image'),
    [messageParts],
  );

  return (
    <div className={styles.bubbleContent}>
      {reasoning ? <ReasoningThink thinking={thinking}>{reasoning}</ReasoningThink> : null}
      {text ? (
        <XMarkdown
          className={`x-markdown-light ${styles.markdown}`}
          content={text}
          components={markdownComponents}
          paragraphTag="div"
          openLinksInNewTab
          escapeRawHtml
          streaming={{
            hasNextChunk: streaming,
            incompleteMarkdownComponentMap: { image: 'incomplete-image' },
          }}
          disableDefaultStyles={['code', 'img']}
        />
      ) : null}
      <GenerateImageBlock parts={imageParts} />
      {sourceItems.length > 0 && !streaming ? (
        <Sources
          className={styles.sources}
          title={`引用 ${sourceItems.length} 个来源`}
          defaultExpanded={false}
          items={sourceItems.map((item) => ({
            ...item,
            icon: <SourceFavicon url={item.url} />,
          }))}
          onClick={openSourceUrl}
        />
      ) : null}
    </div>
  );
}

export default memo(AiBubbleContent, aiBubbleContentPropsAreEqual);
