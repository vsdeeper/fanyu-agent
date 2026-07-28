'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Conversations } from '@ant-design/x';
import type { ConversationItemType } from '@ant-design/x/es/conversations/interface';
import { DeleteOutlined, MenuFoldOutlined, MessageOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { getChatGroupLabel } from '@/lib/chat-group';
import type { ChatListItem } from '@/lib/chat-store';
import { apiDelete } from '@/lib/api-client';
import styles from './ChatSidebar.module.css';

type ChatSidebarProps = {
  chats: ChatListItem[];
  activeChatId: string;
  anchorChatId?: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onCreateChat: () => Promise<void>;
  busy?: boolean;
};

export default function ChatSidebar({
  chats,
  activeChatId,
  anchorChatId,
  collapsed,
  onCollapsedChange,
  onCreateChat,
  busy = false,
}: ChatSidebarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const conversationsRef = useRef<{ nativeElement: HTMLDivElement }>(null);

  const items = useMemo<ConversationItemType[]>(
    () =>
      chats.map((chat) => ({
        key: chat.id,
        label: chat.title,
        group: getChatGroupLabel(chat.updatedAt),
      })),
    [chats],
  );

  const scrollTargetId = anchorChatId || activeChatId;

  // 修复：首条发送或切换会话后，将 active 项滚入 Conversations 可视区
  useEffect(() => {
    if (!scrollTargetId || collapsed) return;
    const root = conversationsRef.current?.nativeElement;
    if (!root) return;

    const frame = requestAnimationFrame(() => {
      const activeEl =
        root.querySelector<HTMLElement>(`[data-key="${scrollTargetId}"]`) ??
        root.querySelector<HTMLElement>('[aria-selected="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    });

    return () => cancelAnimationFrame(frame);
  }, [scrollTargetId, collapsed, chats]);

  const goRefresh = (path: string) => {
    startTransition(() => {
      router.push(path);
      router.refresh();
    });
  };

  const handleDelete = async (chatId: string) => {
    if (busy || deleting) return;
    setDeleting(true);
    try {
      await apiDelete<null>(`/api/chats/${chatId}`);

      if (chatId === activeChatId) {
        startTransition(() => {
          router.push('/chat');
          router.refresh();
        });
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const actionsDisabled = busy || pending || deleting;

  return (
    // 修复：width 动画勿加在内容容器上，否则内层会重排压缩；shell 占位裁切 + panel translateX 滑出
    <div className={`${styles.sidebarShell} ${collapsed ? styles.sidebarShellCollapsed : ''}`}>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
        aria-hidden={collapsed}
        inert={collapsed || undefined}
      >
        <div className={styles.header}>
          <Typography.Text strong className={styles.brand}>
            AI Agent
          </Typography.Text>
          <Button
            type="text"
            className={styles.collapseBtn}
            icon={<MenuFoldOutlined style={{ fontSize: '16px' }} />}
            aria-label="折叠侧栏"
            shape="circle"
            variant="filled"
            onClick={() => onCollapsedChange(true)}
          />
        </div>

        <div className={styles.creation}>
          <Button
            block
            className={styles.newChatBtn}
            color="default"
            variant="outlined"
            size="medium"
            shape="round"
            icon={<MessageOutlined />}
            disabled={actionsDisabled}
            onClick={() => {
              void onCreateChat();
            }}
          >
            开启新对话
          </Button>
        </div>

        {/* 修复：只有列表区 overflow，header/creation 必须在滚动容器外，否则会整栏一起滚 */}
        <Conversations
          ref={conversationsRef}
          className={styles.conversations}
          items={items}
          activeKey={activeChatId || undefined}
          groupable
          onActiveChange={(key) => {
            if (!key || key === activeChatId || actionsDisabled) return;
            goRefresh(`/chat/${key}`);
          }}
          menu={(conversation) => ({
            items: [
              {
                key: 'delete',
                label: '删除',
                icon: <DeleteOutlined />,
                danger: true,
                disabled: actionsDisabled,
              },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === 'delete') {
                void handleDelete(String(conversation.key));
              }
            },
          })}
        />
      </aside>
    </div>
  );
}
