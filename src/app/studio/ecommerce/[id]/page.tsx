import { notFound } from 'next/navigation';
import { loadEcommerceTask } from '@/app/api/ecommerce/_server/task-store';
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
  return <EcommerceStudio task={task} />;
}
