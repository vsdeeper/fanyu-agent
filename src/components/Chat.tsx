'use client';

import { useMemo, useState } from 'react';
import { Sender, Welcome } from '@ant-design/x';
import BubbleList from '@ant-design/x/es/bubble/BubbleList';
import { useChat } from '@ai-sdk/react';
import { Flex, Typography } from 'antd';
import styles from './chat.module.css';

function getTextFromMessage(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text ?? '')
    .join('');
}

export default function Chat() {
  const [input, setInput] = useState('');
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
          placement: isAi ? ('start' as const) : ('end' as const),
          streaming: isAi && isLast && status === 'streaming',
        };
      }),
    [messages, status],
  );

  const loading = status === 'submitted' || status === 'streaming';

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          AI Agent
        </Typography.Title>
        <Typography.Text type="secondary">Next.js · Vercel AI SDK · Ant Design X</Typography.Text>
      </header>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <Flex vertical align="center" justify="center" style={{ height: '100%' }}>
            <Welcome
              title="开始对话"
              description="基于 Vercel AI SDK 与 @ant-design/x 的聊天脚手架"
            />
          </Flex>
        ) : (
          <BubbleList items={bubbleItems} autoScroll />
        )}
      </div>

      {error ? (
        <Typography.Text type="danger" className={styles.error}>
          {error.message}
        </Typography.Text>
      ) : null}

      <div className={styles.sender}>
        <Sender
          value={input}
          onChange={setInput}
          loading={loading}
          onCancel={stop}
          placeholder="输入消息，按 Enter 发送"
          onSubmit={(value) => {
            const text = value.trim();
            if (!text) return;
            sendMessage({ text });
            setInput('');
          }}
        />
      </div>
    </div>
  );
}
