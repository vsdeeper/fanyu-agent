import type { ReactNode } from 'react';
import ChatShell from '../_components/ChatShell';
import { listChats } from '@/app/api/chats/_server/store';

/** 草稿与具体会话：hydrate 标题用会话列表；侧栏已提升到根 AppLayout */
export default async function ChatSessionLayout({ children }: { children: ReactNode }) {
  const chats = await listChats();
  return <ChatShell chats={chats}>{children}</ChatShell>;
}
