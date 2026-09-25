import {
  isTextUIPart,
  isToolUIPart,
  type ChatRequestOptions,
  type PrepareSendMessagesRequest,
  type UIMessage,
} from 'ai';
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface';
import {
  GENERIC_TOOL_INTERRUPTED_ERROR,
  IMAGE_TOOL_INTERRUPTED_ERROR,
} from '@/app/api/chat/_shared/tool-errors';
import { getCachedUserLocation } from './location';

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

/** 是否存在未完成或被中止收尾的 tool（此时即使正文 done 也应提示已停止） */
function hasInterruptedToolPart(message: UIMessage): boolean {
  for (const part of message.parts ?? []) {
    if (!isToolUIPart(part)) continue;
    if (part.state === 'input-streaming' || part.state === 'input-available') {
      return true;
    }
    if (part.state !== 'output-available') continue;
    const output = part.output as { ok?: boolean; error?: unknown } | undefined;
    if (
      output?.ok === false &&
      (output.error === IMAGE_TOOL_INTERRUPTED_ERROR ||
        output.error === GENERIC_TOOL_INTERRUPTED_ERROR)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 判断 assistant 消息是否为用户终止的未完成回复。
 * 完整正文（非空 text 且末条 state=done）且无中断 tool 时不算停止，
 * 避免流尾 abort / 误标 metadata.stopped 后完整回答仍提示「已停止」。
 * 中断 tool（finalizeIncompleteToolParts）或正文未收束时仍提示。
 * 修复：旧逻辑只认末 part 仍 streaming，reasoning 已 done、尚无正文时刷新会丢「已停止」标记。
 */
export function isMessageStopped(message: UIMessage): boolean {
  if (message.role !== 'assistant') return false;

  const lastText = message.parts?.findLast(isTextUIPart);
  const body = getPartsText(message, 'text').trim();
  const replyComplete = Boolean(body && lastText?.state === 'done');

  if (replyComplete && !hasInterruptedToolPart(message)) {
    return false;
  }

  if ((message.metadata as { stopped?: boolean } | undefined)?.stopped) {
    return true;
  }

  return !replyComplete;
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
 * - 激活 skill 集合写入 UIMessage.metadata.skillIds（每次发送都写当前集合，可为 []）；
 *   服务端会与意图匹配结果只增不减地合并后落盘（粘滞记录 ≠ 每轮注入正文）
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
