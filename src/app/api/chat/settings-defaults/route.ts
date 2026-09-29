import { buildChatSettingsDefaults } from '@/app/api/chat/_server/settings-defaults';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';

export const runtime = 'nodejs';

/** GET /api/chat/settings-defaults：导出 env 为设置表单初值 */
export async function GET() {
  try {
    return jsonOk(buildChatSettingsDefaults());
  } catch {
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
