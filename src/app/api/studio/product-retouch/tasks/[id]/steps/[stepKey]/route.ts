import {
  handleDeleteProductRetouchTaskStep,
  handleSaveProductRetouchTaskStep,
} from '@/app/api/studio/product-retouch/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; stepKey: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleSaveProductRetouchTaskStep(id, stepKey, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleDeleteProductRetouchTaskStep(id, stepKey);
}
