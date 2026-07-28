'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Sender, Sources, Think, Welcome } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { CommentOutlined, DownOutlined, GlobalOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { getCachedUserLocation, getUserLocation } from '@/lib/user-location';
import styles from './Chat.module.css';

function getPartsText(
  message: { parts?: ReadonlyArray<{ type: string; [key: string]: unknown }> },
  type: 'text' | 'reasoning',
): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === type && typeof part.text === 'string')
    .map((part) => (part.text as string) ?? '')
    .join('');
}

type SourceItem = { key: string; title: string; url: string };

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

function getSourceItems(message: {
  parts?: ReadonlyArray<{ type: string; [key: string]: unknown }>;
}): SourceItem[] {
  if (!message.parts?.length) return [];

  const byUrl = new Map<string, SourceItem>();

  const add = (url: string, title?: string, key?: string) => {
    if (!url || byUrl.has(url)) return;
    byUrl.set(url, {
      key: key ?? url,
      title: title || url,
      url,
    });
  };

  for (const part of message.parts) {
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
  const text = getPartsText(message, 'text');
  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRe.exec(text)) !== null) {
    add(match[2], match[1] || match[2]);
  }

  return Array.from(byUrl.values());
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

const bubbleRole = {
  user: {
    placement: 'end' as const,
    shape: 'corner' as const,
    // variant 默认即为 filled，与文档「filled - corner right」一致
  },
  ai: {
    placement: 'start' as const,
    variant: 'borderless' as const,
  },
};

/** autoScroll 下贴底时 scrollTop≈0；不做正/倒序双分支 */
function isNearBottom(el: HTMLElement, threshold = 40) {
  return Math.abs(el.scrollTop) <= threshold;
}

type ChatProps = {
  id: string;
  initialMessages: UIMessage[];
  isDraft?: boolean;
  onFirstMessageSent?: () => void;
};

export default function Chat({
  id,
  initialMessages,
  isDraft = false,
  onFirstMessageSent,
}: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [scrollBottomChatId, setScrollBottomChatId] = useState(id);
  const listRef = useRef<BubbleListRef>(null);
  const firstMessageSentRef = useRef(false);

  // 切换会话默认贴底，隐藏「滚动到底部」
  if (id !== scrollBottomChatId) {
    setScrollBottomChatId(id);
    setShowScrollBottom(false);
  }

  // 修复：transport 只建一次；联网开关经 sendMessage body 传入 prepareSendMessagesRequest
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id: chatId, body }) {
          return {
            body: {
              id: chatId,
              message: messages[messages.length - 1],
              ...body,
            },
          };
        },
      }),
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id,
    messages: initialMessages,
    transport,
    onFinish: () => {
      // 落盘后刷新 layout，侧栏标题/分组才会更新
      router.refresh();
    },
  });

  // 进页后台预取定位（浏览器原生授权）；提交只读缓存，避免 await 阻塞发送
  useEffect(() => {
    console.log('getUserLocation');
    void getUserLocation();
  }, []);

  const bubbleItems = useMemo(() => {
    // submitted：等首包；streaming 起视为已有响应，loading 必须结束
    const awaitingFirstChunk = status === 'submitted';
    const lastMessage = messages[messages.length - 1];
    const lastIsUser = lastMessage?.role === 'user';

    const items = messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const isAi = message.role !== 'user';
      const streaming = isAi && isLast && status === 'streaming';
      const text = getPartsText(message, 'text');
      const reasoning = isAi ? getPartsText(message, 'reasoning') : '';
      const thinking = streaming && !text;
      const sourceItems = isAi ? getSourceItems(message) : [];

      return {
        key: message.id,
        role: isAi ? ('ai' as const) : ('user' as const),
        content: isAi ? (
          <div className={styles.bubbleContent}>
            {reasoning ? <ReasoningThink thinking={thinking}>{reasoning}</ReasoningThink> : null}
            {text ? (
              <XMarkdown
                className={`x-markdown-light ${styles.markdown}`}
                content={text}
                openLinksInNewTab
                escapeRawHtml
                streaming={{
                  hasNextChunk: streaming,
                  tail: streaming,
                }}
              />
            ) : null}
            {sourceItems.length > 0 ? (
              <Sources
                className={styles.sources}
                title={`引用 ${sourceItems.length} 个来源`}
                defaultExpanded={false}
                items={sourceItems.map((item) => ({
                  ...item,
                  icon: <SourceFavicon url={item.url} />,
                }))}
                onClick={(item) => {
                  if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                }}
              />
            ) : null}
          </div>
        ) : (
          text
        ),
        streaming,
        // 末条已是 AI（如 regenerate）时，submitted 阶段直接挂 loading
        loading: awaitingFirstChunk && isAi && isLast,
      };
    });

    // 正常发送：submitted 时末条仍是 user，补占位 AI loading 气泡
    if (awaitingFirstChunk && lastIsUser) {
      items.push({
        key: 'ai-pending',
        role: 'ai' as const,
        content: '',
        streaming: false,
        loading: true,
      });
    }

    return items;
  }, [messages, status]);

  const loading = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;

  const senderNode = (
    <div className={styles.sender}>
      <Sender
        value={input}
        onChange={setInput}
        loading={loading}
        onCancel={stop}
        placeholder="给 AI Agent 发送消息"
        footer={
          <Sender.Switch
            value={webSearchEnabled}
            onChange={setWebSearchEnabled}
            icon={<GlobalOutlined />}
          >
            联网搜索
          </Sender.Switch>
        }
        onSubmit={(value) => {
          const text = value.trim();
          if (!text) return;
          // 仅同步读预取缓存；未就绪则本轮不带位置，不在此 await 定位
          const userLocation = webSearchEnabled ? getCachedUserLocation() : null;
          sendMessage(
            { text },
            {
              body: {
                webSearch: webSearchEnabled,
                ...(userLocation ? { userLocation } : {}),
              },
            },
          );
          // 修复：草稿首条发送后立即 replace 到 /chat/[id]，须在本组件 remount 前触发
          if (isDraft && !firstMessageSentRef.current) {
            firstMessageSentRef.current = true;
            onFirstMessageSent?.();
          }
          setInput('');
        }}
      />
    </div>
  );

  return (
    <div className={styles.chat}>
      {hasMessages ? (
        <>
          <div className={styles.messages}>
            <BubbleList
              ref={listRef}
              className={styles.bubbleList}
              items={bubbleItems}
              role={bubbleRole}
              autoScroll
              onScroll={(event) => {
                setShowScrollBottom(!isNearBottom(event.currentTarget));
              }}
            />
            {showScrollBottom ? (
              <Button
                className={styles.scrollBottom}
                shape="circle"
                icon={<DownOutlined />}
                aria-label="滚动到底部"
                onClick={() => {
                  listRef.current?.scrollTo({ top: 'bottom', behavior: 'smooth' });
                  setShowScrollBottom(false);
                }}
              />
            ) : null}
          </div>

          <div className={styles.composer}>
            {error ? (
              <Typography.Text type="danger" className={styles.error}>
                {error.message}
              </Typography.Text>
            ) : null}

            {senderNode}

            <Typography.Text type="secondary" className={styles.disclaimer}>
              内容由 AI 生成，请仔细甄别
            </Typography.Text>
          </div>
        </>
      ) : (
        <div className={styles.emptyStage}>
          <Welcome
            variant="borderless"
            icon={<CommentOutlined style={{ fontSize: 32 }} />}
            title="开始对话"
            description="基于 Vercel AI SDK 与 @ant-design/x 的聊天脚手架"
          />
          {senderNode}
        </div>
      )}
    </div>
  );
}
