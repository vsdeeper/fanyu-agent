import { notFound } from 'next/navigation';
import { loadImageTextTask } from '@/app/api/studio/image-text/_server/task-runtime';
import ImageTextStudio from '../_components/ImageTextStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取图文任务详情并进入工作台；不存在则 404。 */
export default async function ImageTextTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadImageTextTask(id);
  if (!task) notFound();
  return <ImageTextStudio task={task} />;
}
