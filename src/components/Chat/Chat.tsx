'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BubbleItemType, Welcome } from '@ant-design/x';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { useChat, type Chat as ChatInstance } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { CommentOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { getUserLocation } from '@/lib/geo/client';
import { resolveActiveSkillIds } from '@/lib/skills/context';
import AiBubbleContent from './AiBubbleContent';
import ChatSender from './ChatSender';
import UserBubbleContent from './UserBubbleContent';
import styles from './Chat.module.css';
import { bubbleRole } from './constants';
import {
  collectStoppedMessageIds,
  getPartsText,
  isMessageStopped,
  isNearBottom,
  submitChatMessage,
} from './utils';

type ChatProps = {
  chat: ChatInstance<UIMessage>;
  isDraft?: boolean;
  onFirstMessageSent?: () => void;
};

export default function Chat({ chat, isDraft = false, onFirstMessageSent }: ChatProps) {
  const id = chat.id;
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  // 修复：激活 skill 集合作为会话上下文——挂载时从历史（messages.data 已落盘 metadata.skillIds）恢复，
  // 刷新后 Tags 仍显示；chat 切换靠 key remount 自然重置
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>(
    () => resolveActiveSkillIds(chat.messages) ?? [],
  );
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<BubbleListRef>(null);
  const sentOnceRef = useRef(false);
  const [stoppedMessageIds, setStoppedMessageIds] = useState<ReadonlySet<string>>(() =>
    collectStoppedMessageIds(chat.messages),
  );

  const { messages, sendMessage, status, stop } = useChat({
    chat,
    throttle: 100,
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

  const loading = status === 'submitted' || status === 'streaming';

  const handleCancel = useCallback(() => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === 'assistant') {
      setStoppedMessageIds((prev) => new Set(prev).add(lastMessage.id));
    }
    stop();
  }, [messages, stop]);

  const bubbleItems = useMemo<BubbleItemType[]>(() => {
    // 修复：loading 延续到有可见 text/reasoning，避免 submitted→streaming 首包空 parts 时的真空期
    const isAwaitingAi = status === 'submitted' || status === 'streaming';

    const items = messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const isAi = message.role !== 'user';
      const streaming = isAi && isLast && status === 'streaming';
      const text = getPartsText(message, 'text');
      const reasoning = isAi ? getPartsText(message, 'reasoning') : '';
      const hasVisibleAiContent = Boolean(text || reasoning);
      const thinking = streaming && !text;
      const stopped =
        isAi && !streaming && (stoppedMessageIds.has(message.id) || isMessageStopped(message));

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
        footer: stopped ? (
          <Typography.Text type="secondary" className={styles.stoppedHint}>
            这条消息已停止
          </Typography.Text>
        ) : null,
      };
    });

    return items;
  }, [messages, status, stoppedMessageIds]);

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
      skillIds: activeSkillIds,
      showScrollBottom,
      listRef,
      sendMessage,
    });
  };

  const senderProps = {
    id,
    loading,
    isDraft,
    activeSkillIds,
    onSkillChange: setActiveSkillIds,
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
                shape="round"
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
