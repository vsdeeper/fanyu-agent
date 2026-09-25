import {
  handleCreateNovelTask,
  handleListNovelTasks,
} from '@/app/api/studio/novel/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListNovelTasks(req);
}

export function POST(req: Request) {
  return handleCreateNovelTask(req);
}
