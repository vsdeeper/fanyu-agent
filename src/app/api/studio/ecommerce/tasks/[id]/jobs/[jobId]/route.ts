import { handleCancelEcommerceJob } from '@/app/api/studio/ecommerce/_server/job-runtime';

export const maxDuration = 600;

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; jobId: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, jobId } = await context.params;
  return handleCancelEcommerceJob(id, jobId);
}
