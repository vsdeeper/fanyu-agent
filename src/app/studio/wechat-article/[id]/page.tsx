import { notFound } from 'next/navigation';
import { loadWechatArticleTask } from '@/app/api/studio/wechat-article/_server/task-runtime';
import WechatArticleStudio from '../_components/WechatArticleStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取公众号任务详情并进入写作工作台；不存在则 404。 */
export default async function WechatArticleTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadWechatArticleTask(id);
  if (!task) notFound();
  return <WechatArticleStudio task={task} />;
}
