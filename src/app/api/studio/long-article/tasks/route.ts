import {
  handleCreateLongArticleTask,
  handleListLongArticleTasks,
} from '@/app/api/studio/long-article/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListLongArticleTasks(req);
}

export function POST(req: Request) {
  return handleCreateLongArticleTask(req);
}
