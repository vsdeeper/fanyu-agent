import type { ReactNode } from 'react';
import ChatShell from './_components/ChatShell';
import { listChats } from '@/app/api/chats/_server/store';

/** 对话段 layout：hydrate 标题用会话列表；侧栏已提升到根 AppLayout */
export default async function ChatSegmentLayout({ children }: { children: ReactNode }) {
  const chats = await listChats();
  return <ChatShell chats={chats}>{children}</ChatShell>;
}
