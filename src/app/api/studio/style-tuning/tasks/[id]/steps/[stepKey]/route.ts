import {
  handleDeleteStyleTuningTaskStep,
  handleSaveStyleTuningTaskStep,
} from '@/app/api/studio/style-tuning/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; stepKey: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleSaveStyleTuningTaskStep(id, stepKey, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleDeleteStyleTuningTaskStep(id, stepKey);
}
