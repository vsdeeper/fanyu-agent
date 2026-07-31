import { isReasoningUIPart, isTextUIPart, type UIMessage } from 'ai';

/**
 * 是否展示「继续生成」：仅 text/reasoning 带 state；CustomContent 等无此字段，勿直接读。
 * 修复：用 state === 'streaming' 判定中断；!== 'done' 会把落盘后无 state 的历史消息也当成未完成。
 */
export function shouldShowContinueButton(message: UIMessage | undefined, isLast: boolean): boolean {
  if (message?.role !== 'assistant' || !isLast) return false;
  const lastPart = message.parts.at(-1);
  if (lastPart && !isTextUIPart(lastPart) && !isReasoningUIPart(lastPart)) return false;
  return lastPart?.state !== 'done';
}
