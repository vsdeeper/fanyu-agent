import {
  handleDeleteLongArticleTask,
  handleGetLongArticleTask,
  handleUpdateLongArticleTask,
} from '@/app/api/studio/long-article/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetLongArticleTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateLongArticleTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteLongArticleTask(id);
}
