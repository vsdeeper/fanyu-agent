import {
  handleCreateProductModelTask,
  handleListProductModelTasks,
} from '@/app/api/product-model/_server/handle-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListProductModelTasks(req);
}

export function POST(req: Request) {
  return handleCreateProductModelTask(req);
}
