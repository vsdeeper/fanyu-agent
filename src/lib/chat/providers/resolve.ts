import { arkRuntime } from './ark/runtime';
import { getChatProvider, type ChatProvider } from './config';
import { deepseekRuntime } from './deepseek/runtime';
import type { ChatProviderRuntime } from './types';

/** 按 CHAT_PROVIDER 返回当前 Provider 运行时实现 */
export function getChatProviderRuntime(): ChatProviderRuntime {
  return getChatProviderRuntimeFor(getChatProvider());
}

/** 按指定 Provider 返回运行时实现（供 select-model 等传入 provider 参数的场景） */
export function getChatProviderRuntimeFor(provider: ChatProvider): ChatProviderRuntime {
  return provider === 'deepseek' ? deepseekRuntime : arkRuntime;
}
