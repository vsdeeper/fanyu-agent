import {
  handleCreateProductModelTask,
  handleListProductModelTasks,
} from '@/app/api/studio/product-model/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListProductModelTasks(req);
}

export function POST(req: Request) {
  return handleCreateProductModelTask(req);
}
