import { notFound } from 'next/navigation';
import type { UIMessage } from 'ai';
import Chat from '@/components/Chat';
import { chatExists, loadChat } from '@/lib/chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;

  if (!(await chatExists(id))) {
    notFound();
  }

  const record = await loadChat(id);

  return <Chat id={id} initialMessages={record.messages as UIMessage[]} />;
}
