import 'server-only';

import type { Tool } from 'ai';

/**
 * 给本地 web_search 加调用次数硬上限。
 * 并行 tool call 在 await 前同步占位，超限直接返回失败文案，不再打上游 API。
 */
export function withWebSearchCallBudget(searchTool: Tool, maxCalls: number): Tool {
  let used = 0;
  const execute = searchTool.execute;
  if (!execute) return searchTool;

  return {
    ...searchTool,
    execute: async (input, options) => {
      used += 1;
      if (used > maxCalls) {
        return {
          ok: false as const,
          error: `联网检索次数已达上限（${maxCalls}），请基于已有结果输出简报与 JSON`,
        };
      }
      return execute(input, options);
    },
  };
}
