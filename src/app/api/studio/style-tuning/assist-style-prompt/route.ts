import { handleAssistStylePrompt } from '@/app/api/studio/style-tuning/_server/handle-assist-style-prompt';
import { SERVICE_UNAVAILABLE } from '@/app/api/studio/_server/constants';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

export const maxDuration = 60;

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    return await handleAssistStylePrompt(req);
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, SERVICE_UNAVAILABLE, 500);
  }
}
