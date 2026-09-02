import { handleEcommerceGenerate } from '@/app/api/ecommerce/_server/handle-generate';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { SERVICE_UNAVAILABLE } from '../_server/constants';

export const maxDuration = 600;

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleEcommerceGenerate(req);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, SERVICE_UNAVAILABLE, 500);
  }
}
