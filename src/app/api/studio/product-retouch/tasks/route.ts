import {
  handleCreateProductRetouchTask,
  handleListProductRetouchTasks,
} from '@/app/api/studio/product-retouch/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListProductRetouchTasks(req);
}

export function POST(req: Request) {
  return handleCreateProductRetouchTask(req);
}
