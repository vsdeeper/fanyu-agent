import { serveStyleTuningTaskAsset } from '@/app/api/studio/style-tuning/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id, assetId } = await context.params;
  return serveStyleTuningTaskAsset(id, assetId);
}
