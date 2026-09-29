import { getChatSettings } from '@/app/api/chat/_server/request-settings';

/** 模型档次：pro（复杂推理/代码/长文）、lite（通用均衡）、mini（简单问候/短查询） */
export type ModelTier = 'pro' | 'lite' | 'mini';

/** 聊天 Provider：deepseek（DeepSeek 直连，默认）| ark（火山方舟）| zhipu（智谱 BigModel） */
export type ChatProvider = 'deepseek' | 'ark' | 'zhipu';

/** 读取对话 Provider：仅本轮请求 settings */
export function getChatProvider(): ChatProvider {
  const fromSettings = getChatSettings()?.chatProvider;
  if (fromSettings === 'deepseek' || fromSettings === 'ark' || fromSettings === 'zhipu') {
    return fromSettings;
  }
  throw new Error('缺少对话设置，无法解析对话供应商');
}

/** 按 Provider + 档位获取模型 ID；仅本轮请求 settings.chatModels */
export function getModelId(provider: ChatProvider, tier: ModelTier): string {
  const settings = getChatSettings();
  if (!settings) {
    throw new Error('缺少对话设置，无法解析模型 ID');
  }
  if (tier === 'pro') return settings.chatModels.modelPro;
  if (tier === 'lite') return settings.chatModels.modelLite;
  return settings.chatModels.modelMini;
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
