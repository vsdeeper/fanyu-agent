import { deleteChat } from '@/lib/chat-store';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteChat(id);
  return Response.json({ ok: true });
}
