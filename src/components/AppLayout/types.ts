import type { ReactNode } from 'react';
import type { ChatListItem } from '@/app/api/chats/_shared/types';

export type AppLayoutProps = {
  chats: ChatListItem[];
  children: ReactNode;
};

export type WorkspaceContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  /** 开启新对话：已在草稿态则换 draftId，否则跳转 /chat */
  createChat: () => void;
  /** ChatShell 挂载时注册换稿回调，卸载时传 null */
  registerNewDraftHandler: (handler: (() => void) | null) => void;
  anchorChatId: string | undefined;
  setAnchorChatId: (id: string | undefined) => void;
  busy: boolean;
};
