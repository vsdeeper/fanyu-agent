import type { Tool } from 'ai';

/**
 * 跨域 Agent 工具定义。所有本地 tool 统一在此域注册（src/lib/tools/），
 * 不绑定任何业务域；execute 内再调用 images 等能力层。
 */
export type AgentToolContext = {
  chatId: string;
  pastedImageDataUrl?: string;
};

export type AgentToolDefinition = {
  /** 与 streamText tools 的 key 一致，如 generate_image */
  id: string;
  create: (ctx: AgentToolContext) => Tool;
  getHint: () => string;
  /** 本轮有粘贴图时额外注入 */
  getPasteHint?: () => string;
};

/** generate_image edit 无源图时的失败文案；前端据此不渲染失败缩略图，改由主模型文字提示 */
export const IMAGE_TOOL_PASTE_SOURCE_ERROR = '请将要修改的图复制粘贴到对话框后再试';

/** 刷新/停止导致 generate_image 未完成时的失败文案 */
export const IMAGE_TOOL_INTERRUPTED_ERROR = '生成已中断';
