import { isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';

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
