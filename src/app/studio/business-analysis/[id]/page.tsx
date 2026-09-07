import { notFound } from 'next/navigation';
import { loadBusinessAnalysisTask } from '@/app/api/studio/business-analysis/_server/task-runtime';
import BusinessAnalysisStudio from '../_components/BusinessAnalysisStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取商业分析任务详情并进入物料编辑；不存在则 404。 */
export default async function BusinessAnalysisTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadBusinessAnalysisTask(id);
  if (!task) notFound();
  return <BusinessAnalysisStudio task={task} />;
}
