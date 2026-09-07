import {
  handleCreateEcommerceTask,
  handleListEcommerceTasks,
} from '@/app/api/studio/ecommerce/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListEcommerceTasks(req);
}

export function POST(req: Request) {
  return handleCreateEcommerceTask(req);
}
