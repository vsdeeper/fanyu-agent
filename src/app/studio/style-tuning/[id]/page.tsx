import { notFound } from 'next/navigation';
import { loadStyleTuningTask } from '@/app/api/studio/style-tuning/_server/task-runtime';
import StyleTuningStudio from '../_components/StyleTuningStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取文风调任务详情并进入工作台；不存在则 404。 */
export default async function StyleTuningTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadStyleTuningTask(id);
  if (!task) notFound();
  return <StyleTuningStudio task={task} />;
}
