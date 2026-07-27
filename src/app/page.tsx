import { redirect } from 'next/navigation';
import { listChats } from '@/lib/chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 修复：有历史进最近一条；无历史进 /chat（由该页 createChat，避免在 / 堆积逻辑）。
 */
export default async function HomePage() {
  const chats = await listChats();
  if (chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }
  redirect('/chat');
}
