import {
  handleCreateEcommerceJob,
  handleListEcommerceJobs,
} from '@/app/api/studio/ecommerce/_server/job-runtime';

export const maxDuration = 600;

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleListEcommerceJobs(id);
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleCreateEcommerceJob(id, req);
}
