import {
  DefaultChatTransport,
  readUIMessageStream,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ChatRequestOptions,
  type PrepareSendMessagesRequest,
  type UIMessage,
} from 'ai';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { getCachedUserLocation } from '@/lib/geo/client';
import type { UserLocation } from '@/lib/geo/types';

/** 提取消息 parts 中指定类型（text / reasoning）的文本 */
export function getPartsText(
  message: { parts?: ReadonlyArray<{ type: string; [key: string]: unknown }> },
  type: 'text' | 'reasoning',
): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === type && typeof part.text === 'string')
    .map((part) => (part.text as string) ?? '')
    .join('');
}

/** autoScroll 下贴底时 scrollTop≈0；不做正/倒序双分支 */
export function isNearBottom(el: HTMLElement, threshold = 40) {
  return Math.abs(el.scrollTop) <= threshold;
}

/**
 * DefaultChatTransport 的请求预处理：区分「继续生成」与普通提交，组装服务端 body。
 * 修复：transport 只建一次，userLocation 经 sendMessage body 传入本函数再带出。
 */
export const prepareSendMessagesRequest: PrepareSendMessagesRequest<UIMessage> = ({
  messages,
  id: requestChatId,
  body,
}) => {
  if (
    body &&
    typeof body === 'object' &&
    'trigger' in body &&
    body.trigger === 'continue-message'
  ) {
    const continueBody = body as {
      trigger: 'continue-message';
      messageId: string;
      userLocation?: unknown;
    };
    return {
      body: {
        id: requestChatId,
        trigger: 'continue-message',
        messageId: continueBody.messageId,
        ...(continueBody.userLocation ? { userLocation: continueBody.userLocation } : {}),
      },
    };
  }

  return {
    body: {
      id: requestChatId,
      trigger: 'submit-message',
      message: messages[messages.length - 1],
      ...body,
    },
  };
};

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

export type ContinueGenerationParams = {
  loading: boolean;
  transport: DefaultChatTransport<UIMessage>;
  chatId: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  routerRefresh: () => void;
  abortControllerRef: { current: AbortController | null };
  onStatusChange: (continuing: boolean) => void;
};

/** 「继续生成」按钮：负载中不重复触发，带上定位后交给 continueAssistantMessage 续流 */
export function continueGeneration({
  loading,
  transport,
  chatId,
  messages,
  setMessages,
  routerRefresh,
  abortControllerRef,
  onStatusChange,
}: ContinueGenerationParams): void {
  if (loading) return;

  void continueAssistantMessage({
    transport,
    chatId,
    messages,
    setMessages,
    body: {
      userLocation: getCachedUserLocation(),
    },
    abortControllerRef,
    onStatusChange,
    onFinish: routerRefresh,
  });
}

/** 取消：优先 abort 续写请求（保留半截），否则 stop 当前流 */
export function cancelGeneration(
  continueAbortRef: { current: AbortController | null },
  stop: () => void,
): void {
  if (continueAbortRef.current) {
    continueAbortRef.current.abort();
    return;
  }
  stop();
}

export type SubmitChatMessageParams = {
  text: string;
  files?: FileList;
  skillIds?: string[];
  showScrollBottom: boolean;
  listRef: { current: BubbleListRef | null };
  sendMessage: (
    message: { text: string; files?: FileList; metadata?: { skillIds: string[] } },
    options?: ChatRequestOptions,
  ) => void;
};

/**
 * 发送新消息：
 * - 若用户上滑未贴底（「滚动到底部」按钮可见），先自动滚回底部；
 *   autoScroll 只在已贴底时跟随，上滑后不会主动拉回
 * - 附件经 SDK 转 data URL 写入 UIMessage 落盘；勿像 reasoning 一样 prune 历史 file parts
 * - 修复：激活 skill 集合写入 UIMessage.metadata.skillIds（每次发送都写当前集合，可为 []），
 *   随 messages.data 落盘成为会话上下文；服务端据此推导集合注入与令牌原位展开
 */
export function submitChatMessage({
  text,
  files,
  skillIds = [],
  showScrollBottom,
  listRef,
  sendMessage,
}: SubmitChatMessageParams): void {
  if (showScrollBottom) {
    listRef.current?.scrollTo({ top: 'bottom', behavior: 'smooth' });
  }
  const userLocation = getCachedUserLocation();
  const message = files?.length ? { text, files } : { text };
  sendMessage(
    { ...message, metadata: { skillIds } },
    {
      body: {
        ...(userLocation ? { userLocation } : {}),
      },
    },
  );
}
