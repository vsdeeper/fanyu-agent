import { handleEcommerceHelpWrite } from '@/app/api/ecommerce/_server/handle-help-write';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { SERVICE_UNAVAILABLE } from '../_server/constants';

export const maxDuration = 60;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    return await handleEcommerceHelpWrite(req);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, SERVICE_UNAVAILABLE, 500);
  }
}
