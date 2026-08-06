import { requireEnv } from '@/lib/shared/env';

/** 模型档次：pro（复杂推理/代码/长文）、lite（通用均衡）、mini（简单问候/短查询） */
export type ModelTier = 'pro' | 'lite' | 'mini';

/** 聊天 Provider：deepseek（DeepSeek 直连，默认）| ark（火山方舟） */
export type ChatProvider = 'deepseek' | 'ark';

/** 读取 CHAT_PROVIDER；缺省或未知值回退 deepseek（默认 Provider） */
export function getChatProvider(): ChatProvider {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'deepseek') return 'deepseek';
  if (raw === 'ark') return 'ark';
  console.warn(`[chat-provider] 未知 CHAT_PROVIDER="${raw}"，回退默认 deepseek`);
  return 'deepseek';
}

/** DeepSeek 三档模型 ID 环境变量映射（均可缺省，回退 deepseek-v4-flash） */
const DEEPSEEK_MODEL_TIER_ENV: Record<ModelTier, string> = {
  pro: 'DEEPSEEK_MODEL_PRO',
  lite: 'DEEPSEEK_MODEL_LITE',
  mini: 'DEEPSEEK_MODEL_MINI',
};

/** Ark 三档模型 ID 环境变量映射（均须配置，缺失抛错） */
const ARK_MODEL_TIER_ENV: Record<ModelTier, string> = {
  pro: 'ARK_MODEL_PRO',
  lite: 'ARK_MODEL_LITE',
  mini: 'ARK_MODEL_MINI',
};

/** 按 Provider + 档位获取模型 ID：DeepSeek 缺省回退 deepseek-v4-flash，Ark 缺失抛错 */
export function getModelId(provider: ChatProvider, tier: ModelTier): string {
  if (provider === 'deepseek') {
    return process.env[DEEPSEEK_MODEL_TIER_ENV[tier]]?.trim() || 'deepseek-v4-flash';
  }
  return requireEnv(ARK_MODEL_TIER_ENV[tier]);
}
