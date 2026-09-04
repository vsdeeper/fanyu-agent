import {
  handleCreateEcommerceTask,
  handleListEcommerceTasks,
} from '@/app/api/ecommerce/_server/handle-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListEcommerceTasks(req);
}

export function POST(req: Request) {
  return handleCreateEcommerceTask(req);
}
