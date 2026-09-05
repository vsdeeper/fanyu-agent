import { notFound } from 'next/navigation';
import { loadProductRetouchTask } from '@/app/api/product-retouch/_server/task-store';
import ProductRetouchStudio from '../_components/ProductRetouchStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取产品精修任务详情并进入物料编辑；不存在则 404。 */
export default async function ProductRetouchTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadProductRetouchTask(id);
  if (!task) notFound();
  return <ProductRetouchStudio task={task} />;
}
