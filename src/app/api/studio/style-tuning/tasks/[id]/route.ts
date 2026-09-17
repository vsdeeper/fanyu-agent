import {
  handleDeleteStyleTuningTask,
  handleGetStyleTuningTask,
  handleUpdateStyleTuningTask,
} from '@/app/api/studio/style-tuning/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetStyleTuningTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateStyleTuningTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteStyleTuningTask(id);
}
