import {
  handleDeleteEcommerceTask,
  handleGetEcommerceTask,
  handleUpdateEcommerceTask,
} from '@/app/api/ecommerce/_server/handle-task-by-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetEcommerceTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateEcommerceTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteEcommerceTask(id);
}
