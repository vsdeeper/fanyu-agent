import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { prepareSendMessagesRequest } from '../Chat/utils';

const transport = new DefaultChatTransport({
  api: '/api/chat',
  prepareSendMessagesRequest,
});

const registry = new Map<string, Chat<UIMessage>>();

export type ChatInstance = Chat<UIMessage>;

/**
 * 读取已缓存的 Chat 实例；无则返回 undefined（不新建）。
 */
export function peekChat(id: string): ChatInstance | undefined {
  return registry.get(id);
}

/**
 * 按会话 id 复用 Chat 实例。无缓存时用 initialMessages 新建；已有则原样返回。
 */
export function getOrCreateChat(
  id: string,
  initialMessages: UIMessage[],
  onFinish: () => void,
): ChatInstance {
  const existing = registry.get(id);
  if (existing) {
    return existing;
  }

  const chat = new Chat<UIMessage>({
    id,
    messages: initialMessages,
    transport,
    onFinish,
    onData: (dataPart) => {
      if (dataPart.type !== 'data-chat-title') return;
      onFinish();
    },
  });
  registry.set(id, chat);
  return chat;
}

/**
 * 解析当前路由应对应的 Chat 实例：优先缓存（保留进行中的流）；
 * 草稿无缓存则空实例；已 hydrate 则按磁盘消息新建。
 */
export function resolveRouteChat({
  chatId,
  isDraft,
  hydratedMessages,
  onFinish,
}: {
  chatId: string | undefined;
  isDraft: boolean;
  hydratedMessages: UIMessage[] | null;
  onFinish: () => void;
}): ChatInstance | undefined {
  if (!chatId) {
    return undefined;
  }
  const existing = peekChat(chatId);
  if (existing) {
    return existing;
  }
  if (isDraft) {
    return getOrCreateChat(chatId, [], onFinish);
  }
  if (hydratedMessages === null) {
    return undefined;
  }
  return getOrCreateChat(chatId, hydratedMessages, onFinish);
}
