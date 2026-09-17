import {
  handleCreateStyleTuningTask,
  handleListStyleTuningTasks,
} from '@/app/api/studio/style-tuning/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListStyleTuningTasks(req);
}

export function POST(req: Request) {
  return handleCreateStyleTuningTask(req);
}
