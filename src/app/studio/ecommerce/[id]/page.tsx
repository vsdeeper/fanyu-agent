import { notFound } from 'next/navigation';
import { selectEcommerceRestorableJob } from '@/app/api/studio/ecommerce/_server/job-runtime';
import { loadEcommerceTask } from '@/app/api/studio/ecommerce/_server/task-runtime';
import EcommerceStudio from '../_components/EcommerceStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取电商设计任务详情并进入流程编辑；不存在则 404。 */
export default async function EcommerceTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadEcommerceTask(id);
  if (!task) notFound();
  // 首屏带上运行中（或已结束未落库）的生图作业，让刷新 / 重新进入能直接接上进度
  return <EcommerceStudio task={task} initialJob={selectEcommerceRestorableJob(task)} />;
}
