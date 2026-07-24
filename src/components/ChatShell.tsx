'use client';

import { useCallback, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import type { ChatListItem } from '@/lib/chat-store';
import ChatSidebar from './ChatSidebar';
import styles from './chat-shell.module.css';

type ChatShellProps = {
  chats: ChatListItem[];
  children: ReactNode;
};

export default function ChatShell({ chats, children }: ChatShellProps) {
  const params = useParams();
  const router = useRouter();
  const activeChatId = typeof params?.id === 'string' ? params.id : '';
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const title = useMemo(() => {
    if (!activeChatId) return undefined;
    return chats.find((c) => c.id === activeChatId)?.title;
  }, [activeChatId, chats]);

  const handleCreateChat = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/chats', { method: 'POST' });
      if (!res.ok) throw new Error('创建会话失败');
      const data = (await res.json()) as { id: string };
      startTransition(() => {
        router.push(`/chat/${data.id}`);
        router.refresh();
      });
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  return (
    <div className={styles.shell}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onCreateChat={handleCreateChat}
        busy={busy}
      />
      <div className={styles.main}>
        <div className={styles.mainHeader}>
          {collapsed ? (
            <div className={styles.collapsedBar} role="toolbar" aria-label="侧栏快捷操作">
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                aria-label="展开侧栏"
                shape="circle"
                variant="filled"
                onClick={() => setCollapsed(false)}
              />
              <Button
                type="text"
                icon={<PlusOutlined />}
                aria-label="开启新对话"
                shape="circle"
                variant="filled"
                disabled={busy}
                onClick={() => {
                  void handleCreateChat();
                }}
              />
            </div>
          ) : null}
          {title ? (
            <Typography.Title level={5} className={styles.title}>
              {title}
            </Typography.Title>
          ) : null}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
