import {
  handleDeleteProductRetouchTask,
  handleGetProductRetouchTask,
  handleUpdateProductRetouchTask,
} from '@/app/api/product-retouch/_server/handle-task-by-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetProductRetouchTask(id);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateProductRetouchTask(id, req);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteProductRetouchTask(id);
}
