import { notFound } from 'next/navigation';
import { loadLongArticleTask } from '@/app/api/studio/long-article/_server/task-runtime';
import LongArticleStudio from '../_components/LongArticleStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取长文任务详情并进入写作工作台；不存在则 404。 */
export default async function LongArticleTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadLongArticleTask(id);
  if (!task) notFound();
  return <LongArticleStudio task={task} />;
}
