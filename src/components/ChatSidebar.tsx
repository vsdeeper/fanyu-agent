'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Conversations } from '@ant-design/x';
import type { ConversationItemType } from '@ant-design/x/es/conversations/interface';
import { DeleteOutlined, MenuFoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { getChatGroupLabel } from '@/lib/chat-group';
import type { ChatListItem } from '@/lib/chat-store';
import styles from './chat-sidebar.module.css';

type ChatSidebarProps = {
  chats: ChatListItem[];
  activeChatId: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onCreateChat: () => Promise<void>;
  busy?: boolean;
};

export default function ChatSidebar({
  chats,
  activeChatId,
  collapsed,
  onCollapsedChange,
  onCreateChat,
  busy = false,
}: ChatSidebarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const items = useMemo<ConversationItemType[]>(
    () =>
      chats.map((chat) => ({
        key: chat.id,
        label: chat.title,
        group: getChatGroupLabel(chat.updatedAt),
      })),
    [chats],
  );

  // 折叠后整栏卸载，展开/新建入口改由 ChatShell 胶囊条提供
  if (collapsed) {
    return null;
  }

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
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除会话失败');

      if (chatId === activeChatId) {
        await onCreateChat();
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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Typography.Text strong className={styles.brand}>
          AI Agent
        </Typography.Text>
        <Button
          type="text"
          className={styles.collapseBtn}
          icon={<MenuFoldOutlined />}
          aria-label="折叠侧栏"
          shape="circle"
          variant="filled"
          onClick={() => onCollapsedChange(true)}
        />
      </div>

      <div className={styles.creation}>
        <Button
          block
          color="default"
          variant="outlined"
          size="middle"
          icon={<PlusOutlined />}
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
        className={styles.conversations}
        items={items}
        activeKey={activeChatId}
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
  );
}
