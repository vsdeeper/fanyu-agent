import {
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ChatRequestOptions,
  type PrepareSendMessagesRequest,
  type UIMessage,
} from 'ai';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import { getCachedUserLocation } from '@/lib/geo/client';

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

/**
 * 判断 assistant 消息是否为用户终止的未完成回复。
 * stop 时末 part 常保留 state=streaming；首包前终止则 parts 为空。
 */
export function isMessageStopped(message: UIMessage): boolean {
  if (message.role !== 'assistant') return false;

  const parts = message.parts;
  if (!parts?.length) return true;

  const lastPart = parts.at(-1);
  if (!lastPart) return true;

  if (isReasoningUIPart(lastPart) && lastPart.state === 'streaming') return true;
  if (isTextUIPart(lastPart) && lastPart.state === 'streaming') return true;
  if (
    isToolUIPart(lastPart) &&
    (lastPart.state === 'input-streaming' || lastPart.state === 'input-available')
  ) {
    return true;
  }

  return false;
}

/** autoScroll 下贴底时 scrollTop≈0；不做正/倒序双分支 */
export function isNearBottom(el: HTMLElement, threshold = 40) {
  return Math.abs(el.scrollTop) <= threshold;
}

/**
 * DefaultChatTransport 的请求预处理：组装提交消息的服务端 body。
 * 修复：transport 只建一次，userLocation 经 sendMessage body 传入本函数再带出。
 */
export const prepareSendMessagesRequest: PrepareSendMessagesRequest<UIMessage> = ({
  messages,
  id: requestChatId,
  body,
}) => {
  return {
    body: {
      id: requestChatId,
      message: messages[messages.length - 1],
      ...body,
    },
  };
};

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
