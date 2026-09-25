import { notFound } from 'next/navigation';
import { loadNovelTask } from '@/app/api/studio/novel/_server/task-runtime';
import NovelStudio from '../_components/NovelStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取小说任务详情并进入写作工作台；不存在则 404。 */
export default async function NovelTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadNovelTask(id);
  if (!task) notFound();
  return <NovelStudio task={task} />;
}
