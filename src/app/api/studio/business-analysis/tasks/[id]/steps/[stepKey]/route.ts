import {
  handleDeleteBusinessAnalysisTaskStep,
  handleSaveBusinessAnalysisTaskStep,
} from '@/app/api/studio/business-analysis/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; stepKey: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleSaveBusinessAnalysisTaskStep(id, stepKey, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleDeleteBusinessAnalysisTaskStep(id, stepKey);
}
