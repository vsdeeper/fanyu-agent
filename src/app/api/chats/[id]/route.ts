import { deleteChat } from '@/lib/chat-store';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteChat(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid chat ID';
    if (message === 'Invalid chat ID') {
      return Response.json({ error: message }, { status: 400 });
    }
    throw error;
  }
  return Response.json({ ok: true });
}
