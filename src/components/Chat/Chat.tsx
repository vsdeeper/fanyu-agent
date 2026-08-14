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
import { getUserLocation } from '@/lib/geo/client';
import AiBubbleContent from './AiBubbleContent';
import ChatSender from './ChatSender';
import UserBubbleContent from './UserBubbleContent';
import styles from './Chat.module.css';
import { bubbleRole } from './constants';
import {
  cancelGeneration,
  continueGeneration,
  getPartsText,
  isNearBottom,
  prepareSendMessagesRequest,
  shouldShowContinueButton,
  submitChatMessage,
} from './utils';

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
  const sentOnceRef = useRef(false);

  // 切换会话：贴底隐藏「滚动到底部」
  if (id !== chatId) {
    setChatId(id);
    setShowScrollBottom(false);
  }

  // 修复：transport 只建一次；请求组装见 utils.prepareSendMessagesRequest
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest,
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

  const hasUserMessage = messages.some((message) => message.role === 'user');

  // 修复：草稿首条发送后等到服务端开始流式（saveChat 已提交）再导航 /chat/[id]，
  // 否则乐观 replace 与 saveChat 竞态：带大附件时 POST 体大、服务端解析慢，页面先到
  // → chatExists 为 false → 404；刷新后落库完成才正常。hasUserMessage 确认已发送，
  // status streaming/ready 确认服务端已开始流式（saveChat 必已 await 提交）。
  useEffect(() => {
    if (!isDraft || sentOnceRef.current || !hasUserMessage) return;
    if (status === 'streaming' || status === 'ready') {
      sentOnceRef.current = true;
      onFirstMessageSent?.();
    }
  }, [hasUserMessage, status, isDraft, onFirstMessageSent]);

  const loading = status === 'submitted' || status === 'streaming' || isContinuing;

  const handleContinue = useCallback(() => {
    continueGeneration({
      loading,
      transport,
      chatId: id,
      messages,
      setMessages,
      routerRefresh: () => router.refresh(),
      abortControllerRef: continueAbortRef,
      onStatusChange: setIsContinuing,
    });
  }, [id, loading, messages, router, setMessages, transport]);

  const handleCancel = useCallback(() => {
    cancelGeneration(continueAbortRef, stop);
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
    submitChatMessage({
      text,
      files,
      showScrollBottom,
      listRef,
      sendMessage,
    });
  };

  const senderProps = {
    id,
    loading,
    isDraft,
    onCancel: handleCancel,
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
          <ChatSender {...senderProps} />
        </div>
      )}
    </div>
  );
}
