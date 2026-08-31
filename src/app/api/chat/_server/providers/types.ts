import type { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel, ModelMessage } from 'ai';

import type { UserLocation } from '@/app/api/geo/_shared/types';

/** @ai-sdk/openai 客户端实例（Ark / DeepSeek / Zhipu 共用） */
export type ChatOpenAIClient = ReturnType<typeof createOpenAI>;

export type ChatProviderInstructionsOptions = {
  userLocation: UserLocation | undefined;
  baseInstructions: string;
  convertedMessages: ModelMessage[];
};

/**
 * 主对话模型能力声明：stream-chat / sanitize / 工具组装据此分流，
 * 勿在业务代码内联 provider 字符串判断。
 */
export type ChatProviderCapabilities = {
  /** true = 图片 file part 原样透传直达主模型；false = 转占位符、像素只走 analyze_image */
  acceptsImageInput: boolean;
  /** true = 注册 OpenAI 风格 client.tools.webSearch() SDK 工具；false = Provider 自行处理联网搜索 */
  usesSdkWebSearchTool: boolean;
  /** true = providerOptions.openai 发送 store:false（Responses 端点防 item_reference） */
  needsOpenaiStoreFalse: boolean;
};

/**
 * 聊天 Provider 运行时契约：stream-chat 通过此接口调用出站差异，避免内联 provider 分支。
 */
export type ChatProviderRuntime = {
  /** 惰性 OpenAI 兼容客户端（含自定义 fetch patch） */
  getClient(): ChatOpenAIClient;
  /** 主对话语言模型实例：端点选择（Responses vs Chat Completions）与 model 级包装由实现收口 */
  getMainModel(modelId: string): LanguageModel;
  /** 主对话模型能力声明 */
  getCapabilities(): ChatProviderCapabilities;
  /** web_search tool 构造参数（Ark 透传 userLocation，DeepSeek 为空） */
  getWebSearchArgs(userLocation: UserLocation | undefined): { userLocation?: UserLocation };
  /** 合并 Provider 专属 instructions（含 DeepSeek reasoning passback 编码） */
  getInstructions(options: ChatProviderInstructionsOptions): string;
  /** 传入 streamText providerOptions.openai 的 Provider 专属项 */
  getOpenAIOptions(): Record<string, unknown>;
};
