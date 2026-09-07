import {
  handleDeleteBusinessAnalysisTask,
  handleGetBusinessAnalysisTask,
  handleUpdateBusinessAnalysisTask,
} from '@/app/api/studio/business-analysis/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetBusinessAnalysisTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateBusinessAnalysisTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteBusinessAnalysisTask(id);
}
