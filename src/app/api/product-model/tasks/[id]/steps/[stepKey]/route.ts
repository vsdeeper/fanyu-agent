import {
  handleDeleteProductModelTaskStep,
  handleSaveProductModelTaskStep,
} from '@/app/api/product-model/_server/handle-task-step';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; stepKey: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleSaveProductModelTaskStep(id, stepKey, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, stepKey } = await context.params;
  return handleDeleteProductModelTaskStep(id, stepKey);
}
