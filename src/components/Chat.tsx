'use client';

import { useMemo, useRef, useState } from 'react';
import { Sender, Welcome } from '@ant-design/x';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { useChat } from '@ai-sdk/react';
import { CommentOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import styles from './chat.module.css';

function getTextFromMessage(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text ?? '')
    .join('');
}

const bubbleRole = {
  user: { placement: 'end' as const },
  ai: { placement: 'start' as const },
};

export default function Chat() {
  const [input, setInput] = useState('');
  const listRef = useRef<BubbleListRef>(null);
  const { messages, sendMessage, status, stop, error } = useChat();

  const bubbleItems = useMemo(
    () =>
      messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        const isAi = message.role !== 'user';
        return {
          key: message.id,
          role: isAi ? ('ai' as const) : ('user' as const),
          content: getTextFromMessage(message),
          streaming: isAi && isLast && status === 'streaming',
        };
      }),
    [messages, status],
  );

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
        onSubmit={(value) => {
          const text = value.trim();
          if (!text) return;
          sendMessage({ text });
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
            />
            <Button
              className={styles.scrollBottom}
              shape="circle"
              icon={<DownOutlined />}
              aria-label="滚动到底部"
              onClick={() => listRef.current?.scrollTo({ top: 'bottom', behavior: 'smooth' })}
            />
          </div>

          {error ? (
            <Typography.Text type="danger" className={styles.error}>
              {error.message}
            </Typography.Text>
          ) : null}

          {senderNode}

          <Typography.Text type="secondary" className={styles.disclaimer}>
            内容由 AI 生成，请仔细甄别
          </Typography.Text>
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
