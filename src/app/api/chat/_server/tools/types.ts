import type { Tool } from 'ai';

/**
 * 对话轮次本地 tool 定义。在 chat/_server/tools 注册；execute 调用 images/docs 等能力。
 */
export type AgentToolContext = {
  chatId: string;
  /** 本轮粘贴/上传的全部图片 data URL（按附件顺序） */
  pastedImageDataUrls?: string[];
  /** true = 主模型自带视觉（如 zhipu glm），注册表据此剔除「盲主模型专属」工具与提示词 */
  mainModelAcceptsImage?: boolean;
  /** true = Provider 链路已有原生联网搜索（deepseek/ark 的 SDK server tool），本地 web_search 与之互斥 */
  providerHasNativeWebSearch?: boolean;
};

export type AgentToolDefinition = {
  /** 与 streamText tools 的 key 一致，如 generate_image */
  id: string;
  create: (ctx: AgentToolContext) => Tool;
  /** true = 仅主模型无视觉时注册/注入提示词（工具自身依赖主模型看不见图这一前提） */
  requiresBlindMainModel?: boolean;
  /** true = 仅 Provider 无原生联网搜索时注册/注入提示词（本地 web_search 与原生 server tool 重叠） */
  requiresNoNativeWebSearch?: boolean;
  getHint: () => string;
  /** 本轮有粘贴图时额外注入 */
  getPasteHint?: () => string;
};
