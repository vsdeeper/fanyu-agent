import { deleteChat, loadChat } from '@/lib/chat-store';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const chat = await loadChat(id);
    return Response.json(chat);
  } catch {
    return Response.json({ error: 'Chat not found' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteChat(id);
  return Response.json({ ok: true });
}
