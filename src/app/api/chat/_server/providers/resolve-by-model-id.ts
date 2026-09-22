import type { ChatProvider } from './config';

/**
 * 按模型 id 前缀解析 chat Provider，供识图等「模型 id 与 CHAT_PROVIDER 解耦」的出调使用。
 * 无法识别时返回 null，由调用方转友好失败。
 */
export function resolveChatProviderByModelId(modelId: string): ChatProvider | null {
  const id = modelId.trim().toLowerCase();
  if (!id) return null;
  if (id.startsWith('doubao-')) return 'ark';
  if (id.startsWith('deepseek-')) return 'deepseek';
  if (id.startsWith('glm-')) return 'zhipu';
  return null;
}
