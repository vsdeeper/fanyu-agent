import { notFound } from 'next/navigation';
import { isDraftChatRoute } from '@/lib/chat/route';
import { chatExists } from '@/lib/chat/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id?: string[] }>;
};

/** UI 由 ChatShell 渲染；本页仅做 [[...id]] 路由校验 */
export default async function ChatPage({ params }: PageProps) {
  const { id: idParts } = await params;

  if (isDraftChatRoute(idParts)) {
    return null;
  }

  if (idParts!.length > 1) {
    notFound();
  }

  const id = idParts![0];
  if (!(await chatExists(id))) {
    notFound();
  }

  return null;
}
