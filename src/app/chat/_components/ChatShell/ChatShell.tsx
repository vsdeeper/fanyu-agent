'use client';

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { generateId, type UIMessage } from 'ai';
import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Layout, Spin, Typography } from 'antd';
import type { ChatListItem, ChatRecord } from '@/app/api/chats/_shared/types';
import { apiGet } from '@/lib/shared/client/api-client';
import { resolveChatRouteId } from '@/app/chat/_utils/chat-id';
import ModeSwitch from '@/components/ModeSwitch';
import AuxiliaryPanel from '../AuxiliaryPanel';
import Chat from '../Chat';
import ChatSidebar from '../ChatSidebar';
import { peekChat, resolveRouteChat } from './chat-registry';
import styles from './ChatShell.module.css';

type ChatShellProps = {
  chats: ChatListItem[];
  children: ReactNode;
};

export default function ChatShell({ chats, children }: ChatShellProps) {
  const { id: idParts } = useParams<{ id?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const routeChatId = resolveChatRouteId(idParts);
  const isDraftRoute = !routeChatId;

  const [draftChatId, setDraftChatId] = useState(() => generateId());
  const [hydratedMessages, setHydratedMessages] = useState<UIMessage[] | null>(null);
  const [hydratedChatId, setHydratedChatId] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchorChatId, setAnchorChatId] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const effectiveChatId = isDraftRoute ? draftChatId : routeChatId;

  // 修复：render 内 setState 无法同步清空 hydrate，同帧 resolveRouteChat 仍会读到上一会话消息。
  // 用派生值同步判定「当前路由是否可消费 hydratedMessages」。
  const messagesForRoute =
    isDraftRoute || !routeChatId || routeChatId === hydratedChatId ? hydratedMessages : null;

  // 非草稿路由 hydrate；registry 已有实例（含 draft→同 id 晋升、切回进行中流）时跳过 refetch
  useEffect(() => {
    if (isDraftRoute || !routeChatId) return;
    if (peekChat(routeChatId)) return;

    let cancelled = false;

    void apiGet<ChatRecord>(`/api/chats/${routeChatId}`)
      .then((data) => {
        if (!cancelled) {
          setHydratedChatId(routeChatId);
          setHydratedMessages(data.messages);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHydratedChatId(routeChatId);
          setHydratedMessages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDraftRoute, routeChatId]);

  const chat = resolveRouteChat({
    chatId: effectiveChatId,
    isDraft: isDraftRoute,
    hydratedMessages: messagesForRoute,
    onFinish: () => {
      router.refresh();
    },
  });

  const activeChatId = routeChatId ?? '';

  const title = useMemo(() => {
    if (!activeChatId) return undefined;
    return chats.find((c) => c.id === activeChatId)?.title;
  }, [activeChatId, chats]);

  const handleCreateChat = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 修复：先换 draftId 再跳 /chat，避免在 /chat/[id] 页面临时改用 draft key
      setDraftChatId(generateId());
      if (pathname !== '/chat') {
        startTransition(() => {
          router.push('/chat');
          router.refresh();
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, pathname, router]);

  const handleFirstMessageSent = useCallback(() => {
    if (!isDraftRoute) return;
    setAnchorChatId(effectiveChatId);
    startTransition(() => {
      router.replace(`/chat/${effectiveChatId}`);
      router.refresh();
    });
  }, [effectiveChatId, isDraftRoute, router]);

  return (
    // 修复：布局壳必须用 antd Layout（Header/Content/Sider），组件级 token 才惰性输出为
    // --one-layout-* 并作用到 .ant-layout-*；改用原生 div 会让 components.ts 的 Layout 配置失效
    <Layout hasSider className={styles.shell}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        anchorChatId={anchorChatId}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onCreateChat={handleCreateChat}
        busy={busy}
      />
      <Layout className={styles.main}>
        <Layout.Header className={styles.mainHeader}>
          {collapsed ? (
            <div
              className={`${styles.collapsedBar} ${styles.collapsedBarEnter}`}
              role="toolbar"
              aria-label="侧栏快捷操作"
            >
              <Button
                type="text"
                icon={<MenuUnfoldOutlined style={{ fontSize: '16px' }} />}
                aria-label="展开侧栏"
                shape="circle"
                variant="filled"
                onClick={() => setCollapsed(false)}
              />
              <Button
                type="text"
                icon={<PlusOutlined style={{ fontSize: '16px' }} />}
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
          <div className={styles.headerSpacer} />
          <ModeSwitch />
        </Layout.Header>
        <Layout.Content className={styles.content}>
          {!chat ? (
            <div className={styles.loading}>
              <Spin />
            </div>
          ) : (
            <Chat
              key={effectiveChatId}
              chat={chat}
              isDraft={isDraftRoute}
              onFirstMessageSent={handleFirstMessageSent}
            />
          )}
          {children}
        </Layout.Content>
      </Layout>
      <AuxiliaryPanel chatId={routeChatId} />
    </Layout>
  );
}
