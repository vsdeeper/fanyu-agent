'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { generateId, type UIMessage } from 'ai';
import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Layout, Spin, Typography } from 'antd';
import type { ChatListItem, ChatRecord } from '@/lib/chat/store';
import { apiGet } from '@/lib/shared/api-client';
import { resolveChatRouteId } from '@/lib/chat/route';
import Chat from '@/components/Chat';
import ChatSidebar from '@/components/ChatSidebar';
import ModeSwitch from '@/components/ModeSwitch';
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
  const [loadingChat, setLoadingChat] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchorChatId, setAnchorChatId] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const promotedFromDraftRef = useRef(false);

  const effectiveChatId = isDraftRoute ? draftChatId : routeChatId;

  // 非草稿路由 hydrate；draft→同 id 晋升时跳过 refetch，避免打断 useChat 流
  useEffect(() => {
    if (isDraftRoute || !routeChatId) return;

    if (promotedFromDraftRef.current) {
      promotedFromDraftRef.current = false;
      return;
    }

    let cancelled = false;
    setLoadingChat(true);
    setHydratedMessages(null);

    void apiGet<ChatRecord>(`/api/chats/${routeChatId}`)
      .then((data) => {
        if (!cancelled) setHydratedMessages(data.messages);
      })
      .catch(() => {
        if (!cancelled) setHydratedMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChat(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isDraftRoute, routeChatId]);

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
    promotedFromDraftRef.current = true;
    setAnchorChatId(effectiveChatId);
    startTransition(() => {
      router.replace(`/chat/${effectiveChatId}`);
      router.refresh();
    });
  }, [effectiveChatId, isDraftRoute, router]);

  const chatReady = isDraftRoute || hydratedMessages !== null;

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
          {!chatReady || loadingChat ? (
            <div className={styles.loading}>
              <Spin />
            </div>
          ) : (
            <Chat
              key={effectiveChatId}
              id={effectiveChatId}
              initialMessages={isDraftRoute ? [] : hydratedMessages!}
              isDraft={isDraftRoute}
              onFirstMessageSent={handleFirstMessageSent}
            />
          )}
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
