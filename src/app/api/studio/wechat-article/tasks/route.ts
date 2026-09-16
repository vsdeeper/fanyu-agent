import {
  handleCreateWechatArticleTask,
  handleListWechatArticleTasks,
} from '@/app/api/studio/wechat-article/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleListWechatArticleTasks(req);
}

export function POST(req: Request) {
  return handleCreateWechatArticleTask(req);
}
