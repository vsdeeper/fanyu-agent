import {
  handleDeleteNovelTask,
  handleGetNovelTask,
  handleUpdateNovelTask,
} from '@/app/api/studio/novel/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetNovelTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateNovelTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteNovelTask(id);
}
