import { serveProductModelTaskAsset } from '@/app/api/product-model/_server/serve-task-asset';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id, assetId } = await context.params;
  return serveProductModelTaskAsset(id, assetId);
}
