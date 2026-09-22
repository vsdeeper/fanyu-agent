import {
  handleDeleteImageTextTask,
  handleGetImageTextTask,
  handleUpdateImageTextTask,
} from '@/app/api/studio/image-text/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetImageTextTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateImageTextTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteImageTextTask(id);
}
