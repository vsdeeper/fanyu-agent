import { notFound } from 'next/navigation';
import { loadProductModelTask } from '@/app/api/product-model/_server/task-store';
import ProductModelStudio from '../_components/ProductModelStudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** 读取产品模特任务详情并进入物料编辑；不存在则 404。 */
export default async function ProductModelTaskPage({ params }: PageProps) {
  const { id } = await params;
  const task = loadProductModelTask(id);
  if (!task) notFound();
  return <ProductModelStudio task={task} />;
}
