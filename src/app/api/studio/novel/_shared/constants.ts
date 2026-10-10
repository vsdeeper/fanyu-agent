/** 小说工作室 SSE 事件名（research / structure / chapter-beats / writing 共用）。 */
export const NOVEL_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

/**
 * 小说生成的思考强度。覆盖对话设置。
 * DeepSeek 收 none/low/high/max；智谱不收 none，出站时回落 max。
 */
export const NOVEL_REASONING_EFFORTS = ['none', 'low', 'high', 'max'] as const;

export type NovelReasoningEffort = (typeof NOVEL_REASONING_EFFORTS)[number];

/** 长篇默认拉满；旧任务没写这个字段时也用这一档。 */
export const NOVEL_DEFAULT_REASONING_EFFORT: NovelReasoningEffort = 'max';

/** 读取落盘或请求里的思考强度；缺省、非法都回落 max。 */
export function readNovelReasoningEffort(value: unknown): NovelReasoningEffort {
  if (
    typeof value === 'string' &&
    (NOVEL_REASONING_EFFORTS as readonly string[]).includes(value.trim())
  ) {
    return value.trim() as NovelReasoningEffort;
  }
  return NOVEL_DEFAULT_REASONING_EFFORT;
}
