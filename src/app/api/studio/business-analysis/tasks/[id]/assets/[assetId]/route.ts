import { serveBusinessAnalysisTaskAsset } from '@/app/api/studio/business-analysis/_server/task-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id, assetId } = await context.params;
  return serveBusinessAnalysisTaskAsset(id, assetId);
}
