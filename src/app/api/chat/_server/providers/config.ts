import { requireEnv } from '@/lib/shared/server/env';

/** 模型档次：pro（复杂推理/代码/长文）、lite（通用均衡）、mini（简单问候/短查询） */
export type ModelTier = 'pro' | 'lite' | 'mini';

/** 聊天 Provider：deepseek（DeepSeek 直连，默认）| ark（火山方舟）| zhipu（智谱 BigModel） */
export type ChatProvider = 'deepseek' | 'ark' | 'zhipu';

/** 读取 CHAT_PROVIDER；缺省或未知值回退 deepseek（默认 Provider） */
export function getChatProvider(): ChatProvider {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'deepseek') return 'deepseek';
  if (raw === 'ark') return 'ark';
  if (raw === 'zhipu') return 'zhipu';
  console.warn(`[chat-provider] 未知 CHAT_PROVIDER="${raw}"，回退默认 deepseek`);
  return 'deepseek';
}

/** DeepSeek 三档模型 ID 环境变量映射（均须配置，缺失抛错） */
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

/** 智谱三档模型 ID 环境变量映射（均须配置，缺失抛错；单一多模态模型时三项可填同值） */
const ZHIPU_MODEL_TIER_ENV: Record<ModelTier, string> = {
  pro: 'ZHIPU_MODEL_PRO',
  lite: 'ZHIPU_MODEL_LITE',
  mini: 'ZHIPU_MODEL_MINI',
};

/** 按 Provider + 档位获取模型 ID；三档均须配置，缺失直接抛错（requireEnv），无代码内死值回退 */
export function getModelId(provider: ChatProvider, tier: ModelTier): string {
  if (provider === 'deepseek') {
    return requireEnv(DEEPSEEK_MODEL_TIER_ENV[tier]);
  }
  if (provider === 'zhipu') {
    return requireEnv(ZHIPU_MODEL_TIER_ENV[tier]);
  }
  return requireEnv(ARK_MODEL_TIER_ENV[tier]);
}

/** 生标题这类低要求出调的 reasoningEffort：deepseek/ark 支持 none（关闭思考），zhipu 只收 low/high/max */
const TITLE_REASONING_EFFORT: Record<ChatProvider, 'none' | 'low'> = {
  deepseek: 'none',
  ark: 'none',
  zhipu: 'low',
};

/**
 * 生标题的出站 reasoningEffort：给最省 token 且确保模型能出正文的档位。
 * deepseek/ark 支持 none（关思考）；zhipu 模型始终思考、不支持 none（拒绝 400），只能给 low。
 */
export function getTitleReasoningEffort(provider: ChatProvider): 'none' | 'low' {
  return TITLE_REASONING_EFFORT[provider];
}
