import type { createOpenAI } from '@ai-sdk/openai';
import type { ModelMessage } from 'ai';

import type { UserLocation } from '@/features/geo/types';

/** @ai-sdk/openai 客户端实例（Ark / DeepSeek 共用） */
export type ChatOpenAIClient = ReturnType<typeof createOpenAI>;

export type ChatProviderInstructionsOptions = {
  userLocation: UserLocation | undefined;
  baseInstructions: string;
  convertedMessages: ModelMessage[];
};

/**
 * 聊天 Provider 运行时契约：stream-chat 通过此接口调用出站差异，避免内联 provider 分支。
 */
export type ChatProviderRuntime = {
  /** 惰性 OpenAI 兼容客户端（含自定义 fetch patch） */
  getClient(): ChatOpenAIClient;
  /** web_search tool 构造参数（Ark 透传 userLocation，DeepSeek 为空） */
  getWebSearchArgs(userLocation: UserLocation | undefined): { userLocation?: UserLocation };
  /** 合并 Provider 专属 instructions（含 DeepSeek reasoning passback 编码） */
  getInstructions(options: ChatProviderInstructionsOptions): string;
  /** 传入 streamText providerOptions.openai 的 Provider 专属项（不含 store:false） */
  getOpenAIOptions(): Record<string, unknown>;
};
