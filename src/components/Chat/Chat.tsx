'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BubbleItemType, Welcome } from '@ant-design/x';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { CommentOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { getCachedUserLocation, getUserLocation } from '@/lib/geo/client';
import AiBubbleContent from './AiBubbleContent';
import ChatSender from './ChatSender';
import UserBubbleContent from './UserBubbleContent';
import styles from './Chat.module.css';
import { continueAssistantMessage, shouldShowContinueButton } from './utils';

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
  const [chatId, setChatId] = useState(id);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<BubbleListRef>(null);
  const continueAbortRef = useRef<AbortController | null>(null);

  // 切换会话：贴底隐藏「滚动到底部」
  if (id !== chatId) {
    setChatId(id);
    setShowScrollBottom(false);
  }

  // 修复：transport 只建一次；userLocation 经 sendMessage body 传入 prepareSendMessagesRequest
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id: requestChatId, body }) {
          if (
            body &&
            typeof body === 'object' &&
            'trigger' in body &&
            body.trigger === 'continue-message'
          ) {
            const continueBody = body as {
              trigger: 'continue-message';
              messageId: string;
              userLocation?: unknown;
            };
            return {
              body: {
                id: requestChatId,
                trigger: 'continue-message',
                messageId: continueBody.messageId,
                ...(continueBody.userLocation ? { userLocation: continueBody.userLocation } : {}),
              },
            };
          }

          return {
            body: {
              id: requestChatId,
              trigger: 'submit-message',
              message: messages[messages.length - 1],
              ...body,
            },
          };
        },
      }),
  );

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id,
    messages: initialMessages,
    transport,
    throttle: 100,
    onFinish: () => {
      // 落盘后刷新 layout，侧栏标题/分组才会更新（含 stop 半截落盘）
      router.refresh();
    },
  });

  // 进页后台预取定位（浏览器原生授权）；提交只读缓存，避免 await 阻塞发送
  useEffect(() => {
    void getUserLocation();
  }, []);

  const loading = status === 'submitted' || status === 'streaming' || isContinuing;

  const handleContinue = useCallback(() => {
    if (loading) return;

    void continueAssistantMessage({
      transport,
      chatId: id,
      messages,
      setMessages,
      body: {
        userLocation: getCachedUserLocation(),
      },
      abortControllerRef: continueAbortRef,
      onStatusChange: setIsContinuing,
      onFinish: () => router.refresh(),
    });
  }, [id, loading, messages, router, setMessages, transport]);

  const handleCancel = useCallback(() => {
    if (continueAbortRef.current) {
      continueAbortRef.current.abort();
      return;
    }
    void stop();
  }, [stop]);

  const bubbleItems = useMemo<BubbleItemType[]>(() => {
    // 修复：loading 延续到有可见 text/reasoning，避免 submitted→streaming 首包空 parts 时的真空期
    const isAwaitingAi = status === 'submitted' || status === 'streaming' || isContinuing;

    const items = messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const isAi = message.role !== 'user';
      const streaming = isAi && isLast && (status === 'streaming' || isContinuing);
      const text = getPartsText(message, 'text');
      const reasoning = isAi ? getPartsText(message, 'reasoning') : '';
      const hasVisibleAiContent = Boolean(text || reasoning);
      const thinking = streaming && !text;
      const showContinueButton = shouldShowContinueButton(message, index === messages.length - 1);

      return {
        key: message.id,
        role: isAi ? ('ai' as const) : ('user' as const),
        content: isAi ? (
          <AiBubbleContent
            text={text}
            reasoning={reasoning}
            streaming={streaming}
            thinking={thinking}
            messageParts={message.parts}
          />
        ) : (
          <UserBubbleContent text={text} parts={message.parts} />
        ),
        streaming,
        loading: isAwaitingAi && isAi && isLast && !hasVisibleAiContent,
        classNames: {
          body: isAi ? styles.aiBubbleBody : undefined,
        },
        footer:
          !isAwaitingAi && showContinueButton ? (
            <Flex justify="end" flex={1}>
              <Button shape="round" disabled={loading} onClick={() => void handleContinue()}>
                继续生成
              </Button>
            </Flex>
          ) : null,
      };
    });

    return items;
  }, [handleContinue, isContinuing, loading, messages, status]);

  const hasMessages = messages.length > 0;

  // 修复：composer 绝对定位浮在消息区上，须动态测高写入 --composer-height；勿再写死 148px
  useLayoutEffect(() => {
    if (!hasMessages) return;

    const chatEl = chatRef.current;
    const composerEl = composerRef.current;
    if (!chatEl || !composerEl) return;

    const syncComposerHeight = () => {
      chatEl.style.setProperty('--composer-height', `${composerEl.offsetHeight}px`);
    };

    syncComposerHeight();
    const observer = new ResizeObserver(syncComposerHeight);
    observer.observe(composerEl);
    return () => observer.disconnect();
  }, [hasMessages]);

  const handleSend = ({ text, files }: { text: string; files?: FileList }) => {
    const userLocation = getCachedUserLocation();
    // 修复：附件经 SDK 转 data URL 写入 UIMessage 落盘；勿像 reasoning 一样 prune 历史 file parts
    sendMessage(files?.length ? { text, files } : { text }, {
      body: {
        ...(userLocation ? { userLocation } : {}),
      },
    });
  };

  const senderProps = {
    id,
    loading,
    isDraft,
    onCancel: handleCancel,
    onFirstMessageSent,
    onSend: handleSend,
  };

  return (
    <div ref={chatRef} className={styles.chat}>
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

          <div ref={composerRef} className={styles.composer}>
            <ChatSender {...senderProps} />

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
          <ChatSender {...senderProps} variant="welcome" />
        </div>
      )}
    </div>
  );
}
