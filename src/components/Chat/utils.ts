import {
  DefaultChatTransport,
  readUIMessageStream,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from 'ai';
import type { UserLocation } from '@/lib/shared/user-location';

/**
 * 是否展示「继续生成」按钮（仅 assistant 且为最后一条消息）。
 * - 无 parts：展示（首包未到达即中断）
 * - 末 part 为 reasoning / tool：展示（推理或工具调用阶段中断）
 * - 末 part 为 text 且 state === 'streaming'：展示（正文流式中断）
 * - 其余（text 已完成、CustomContent 等）：不展示
 * 修复：text 用 state === 'streaming' 而非 !== 'done'，避免落盘历史无 state 被当成未完成。
 */
export function shouldShowContinueButton(message: UIMessage, isLast: boolean): boolean {
  if (!isLast) return false;
  if (message.role !== 'assistant') return false;
  const lastPart = message.parts.at(-1);
  if (!lastPart) return true;
  if (isReasoningUIPart(lastPart)) return true;
  if (isToolUIPart(lastPart)) return true;
  if (isTextUIPart(lastPart) && lastPart.state === 'streaming') return true;
  return false;
}

export type ContinueAssistantMessageOptions = {
  transport: DefaultChatTransport<UIMessage>;
  chatId: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  body: {
    webSearch: boolean;
    userLocation?: UserLocation | null;
  };
  abortControllerRef: { current: AbortController | null };
  onStatusChange: (continuing: boolean) => void;
  onFinish?: () => void;
};

/** 断点续写：保留 partial assistant，经 transport 续流并原地更新末条消息 */
export async function continueAssistantMessage({
  transport,
  chatId,
  messages,
  setMessages,
  body,
  abortControllerRef,
  onStatusChange,
  onFinish,
}: ContinueAssistantMessageOptions): Promise<void> {
  const lastMessage = messages.at(-1);
  if (lastMessage?.role !== 'assistant') return;

  const abortController = new AbortController();
  abortControllerRef.current = abortController;
  onStatusChange(true);

  try {
    const stream = await transport.sendMessages({
      chatId,
      messages,
      trigger: 'submit-message',
      messageId: lastMessage.id,
      abortSignal: abortController.signal,
      body: {
        trigger: 'continue-message',
        messageId: lastMessage.id,
        webSearch: body.webSearch,
        ...(body.userLocation ? { userLocation: body.userLocation } : {}),
      },
    });

    for await (const updatedMessage of readUIMessageStream({
      message: lastMessage,
      stream,
    })) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = updatedMessage;
        return next;
      });
    }

    onFinish?.();
  } catch (error) {
    if (abortController.signal.aborted) {
      onFinish?.();
      return;
    }
    throw error;
  } finally {
    abortControllerRef.current = null;
    onStatusChange(false);
  }
}
