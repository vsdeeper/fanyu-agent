import { redirect } from 'next/navigation';
import { createChat, listChats } from '@/lib/chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 修复：若每次进 `/` 都 createChat，刷新/重进会堆积空会话。
 * 有历史则进最近一条；真正新建走侧栏「开启新对话」。
 */
export default async function HomePage() {
  const chats = await listChats();
  if (chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }
  const id = await createChat();
  redirect(`/chat/${id}`);
}
