import type { ReactNode } from 'react';
import ChatShell from '@/components/ChatShell';
import { listChats } from '@/lib/chat/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 侧栏在 layout：/chat/a → /chat/b 时不卸载，折叠状态与列表壳保持 */
export default async function ChatSegmentLayout({ children }: { children: ReactNode }) {
  const chats = await listChats();
  return <ChatShell chats={chats}>{children}</ChatShell>;
}
