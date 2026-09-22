import {
  handleDeleteImageTextTaskStep,
  handleSaveImageTextTaskStep,
} from '@/app/api/studio/image-text/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; stepKey: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleSaveImageTextTaskStep(id, stepKey, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleDeleteImageTextTaskStep(id, stepKey);
}
