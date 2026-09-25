import { handleNovelResearch } from '@/app/api/studio/novel/_server/handle-stream';
import { SERVICE_UNAVAILABLE } from '@/app/api/studio/_server/constants';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

export const maxDuration = 600;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleNovelResearch(req);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, SERVICE_UNAVAILABLE, 500);
  }
}
