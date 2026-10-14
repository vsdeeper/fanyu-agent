/** 小说工作室 SSE 事件名（调研 / 创作方案 / 角色 / 卷章 / 写作 / 润色共用）。 */
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
  return readOptionalNovelReasoningEffort(value) ?? NOVEL_DEFAULT_REASONING_EFFORT;
}

/**
 * 同上，但缺省或非法时返回 undefined。
 * 世界观步骤在选题之前，旧快照没写这一项时调用方还要继续往更旧的步骤找。
 */
export function readOptionalNovelReasoningEffort(value: unknown): NovelReasoningEffort | undefined {
  if (
    typeof value === 'string' &&
    (NOVEL_REASONING_EFFORTS as readonly string[]).includes(value.trim())
  ) {
    return value.trim() as NovelReasoningEffort;
  }
  return undefined;
}

/**
 * 每卷字数：创作方案左栏填的数字，方案与卷纲的篇幅都按它算。
 * 低于下限的一卷装不下前后不能对调的事，终卷也用这个下限。
 */
export const NOVEL_VOLUME_CHARS_MIN = 80_000;
export const NOVEL_VOLUME_CHARS_MAX = 300_000;
export const NOVEL_VOLUME_CHARS_STEP = 10_000;
/** 旧快照没有这个数时的初始值，只是可改的预填。 */
export const NOVEL_DEFAULT_VOLUME_CHARS = 120_000;
/** 单章目标字数，用来把一卷的字数折成章数。 */
export const NOVEL_CHAPTER_TARGET_CHARS = 4000;

/** 每卷字数是否在允许区间内。 */
export function isNovelVolumeCharsInRange(value: number): boolean {
  return (
    Number.isInteger(value) && value >= NOVEL_VOLUME_CHARS_MIN && value <= NOVEL_VOLUME_CHARS_MAX
  );
}

/** 读取落盘或请求里的每卷字数；缺省、越界都返回 undefined。 */
export function readNovelVolumeChars(value: unknown): number | undefined {
  return typeof value === 'number' && isNovelVolumeCharsInRange(value) ? value : undefined;
}

/** 把一卷的字数折成大约章数，最少一章。 */
export function novelChapterCountForVolume(volumeChars: number): number {
  return Math.max(1, Math.round(volumeChars / NOVEL_CHAPTER_TARGET_CHARS));
}
