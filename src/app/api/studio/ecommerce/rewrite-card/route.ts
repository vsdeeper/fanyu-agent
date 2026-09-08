import { handleRewriteCard } from '@/app/api/studio/ecommerce/_server/handle-rewrite-card';
import { SERVICE_UNAVAILABLE } from '@/app/api/studio/_server/constants';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

export const maxDuration = 60;

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleRewriteCard(req);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, SERVICE_UNAVAILABLE, 500);
  }
}
