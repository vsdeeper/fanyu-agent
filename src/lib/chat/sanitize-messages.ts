import { isToolUIPart, type UIMessage } from 'ai';

/**
 * 去掉 assistant 上未完成的 tool part（input-streaming / input-available）。
 * 修复：stop/abort 在 tool 阶段落盘后，下一条请求 convertToModelMessages 会因缺 tool result 抛 MissingToolResultsError。
 */
export function dropIncompleteToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== 'assistant' || !message.parts?.length) {
      return message;
    }

    const parts = message.parts.filter(
      (part) =>
        !isToolUIPart(part) ||
        (part.state !== 'input-streaming' && part.state !== 'input-available'),
    );

    if (parts.length === message.parts.length) {
      return message;
    }

    return { ...message, parts };
  });
}
