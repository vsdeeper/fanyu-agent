import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Conversations } from '@ant-design/x';
import type { ConversationItemType } from '@ant-design/x/es/conversations/interface';
import {
  BgColorsOutlined,
  DeleteOutlined,
  MenuFoldOutlined,
  MessageOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { Button, Layout, Typography } from 'antd';
import { useWorkspace } from '@/components/AppLayout/context';
import { ECOMMERCE_PATH, PRODUCT_RETOUCH_PATH } from './constants';
import { getActiveChatIdFromPathname, getChatGroupLabel } from './utils';
import type { ChatListItem } from '@/app/api/chats/_shared/types';
import { apiDelete } from '@/lib/shared/client/api-client';
import styles from './Sidebar.module.css';

type SidebarProps = {
  chats: ChatListItem[];
};

export default function Sidebar({ chats }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const conversationsRef = useRef<{ nativeElement: HTMLDivElement }>(null);
  const { collapsed, setCollapsed, createChat, busy, anchorChatId } = useWorkspace();

  const activeChatId = getActiveChatIdFromPathname(pathname);
  const isProductRetouch = pathname === PRODUCT_RETOUCH_PATH;
  const isEcommerce = pathname === ECOMMERCE_PATH;

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

  const actionsDisabled = busy;

  return (
    // 修复：侧栏必须用 antd Layout.Sider——组件级 token 惰性输出，布局壳用原生元素时 Layout.* 配置失效。
    // 折叠交互保留原方案：Sider 自带 width 裁切（collapsedWidth=0），内层 .panel 固定宽 + translateX 滑出，
    // width 动画勿加在内容容器上，否则内层会重排压缩。
    <Layout.Sider
      width={260}
      collapsedWidth={0}
      collapsed={collapsed}
      trigger={null}
      className={styles.sider}
      aria-hidden={collapsed}
      inert={collapsed || undefined}
    >
      <div className={`${styles.panel} ${collapsed ? styles.panelCollapsed : ''}`}>
        <div className={styles.header}>
          <Typography.Text strong className={styles.brand}>
            凡域智能助手
          </Typography.Text>
          <Button
            type="text"
            className={styles.collapseBtn}
            icon={<MenuFoldOutlined style={{ fontSize: '16px' }} />}
            aria-label="折叠侧栏"
            shape="circle"
            variant="filled"
            onClick={() => setCollapsed(true)}
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
            onClick={createChat}
          >
            开启新对话
          </Button>
        </div>

        {/* 品牌与「开启新对话」固定；电商入口与会话列表同一滚动区 */}
        <div className={styles.scroll}>
          <div className={styles.nav}>
            <Button
              block
              className={`${styles.navBtn} ${isProductRetouch ? styles.navBtnActive : ''}`}
              color="default"
              variant="text"
              size="medium"
              icon={<BgColorsOutlined />}
              aria-current={isProductRetouch ? 'page' : undefined}
              onClick={() => {
                if (isProductRetouch) return;
                goRefresh(PRODUCT_RETOUCH_PATH);
              }}
            >
              产品精修
            </Button>
            <Button
              block
              className={`${styles.navBtn} ${isEcommerce ? styles.navBtnActive : ''}`}
              color="default"
              variant="text"
              size="medium"
              icon={<ShoppingOutlined />}
              aria-current={isEcommerce ? 'page' : undefined}
              onClick={() => {
                if (isEcommerce) return;
                goRefresh(ECOMMERCE_PATH);
              }}
            >
              电商设计
            </Button>
          </div>

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
        </div>
      </div>
    </Layout.Sider>
  );
}
