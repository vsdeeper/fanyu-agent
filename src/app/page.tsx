import { redirect } from 'next/navigation';
import { listChats } from '@/app/api/chats/_server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 修复：有历史进最近一条；无历史进 /chat 草稿欢迎态（不写库，首条发送后由 ChatShell replace 到 /chat/[id]）。
 */
export default async function HomePage() {
  const chats = await listChats();
  if (chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }
  redirect('/chat');
}
