import {
  handleCreateImageTextTask,
  handleListImageTextTasks,
} from '@/app/api/studio/image-text/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListImageTextTasks(req);
}

export function POST(req: Request) {
  return handleCreateImageTextTask(req);
}
