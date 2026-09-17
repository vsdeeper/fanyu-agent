import type { StyleTuningPublishScene } from '../_shared/types';

export const SOFT_TUNE_FAILED = '软调参数生成失败，请稍后重试';
export const SOFT_TUNE_TRUNCATED = '软调输出被截断，请重试生成';
export const TRIAL_WRITE_FAILED = '试写失败，请稍后重试';
export const TRIAL_WRITE_TRUNCATED = '试写输出被截断，请重试生成';
export const MISSING_STYLE = '请先选择文风';
export const MISSING_TOPIC_CONTENT = '请先填写主题内容';

/**
 * 软调输出上限。思考模型会把 reasoning 与正文计入同一预算；
 * 过小易在 JSON 写完前被 length 截断。
 */
export const STYLE_TUNING_SOFT_TUNE_MAX_OUTPUT_TOKENS = 8192;

/**
 * 试写输出上限。成稿更长，且思考模型把 reasoning 与正文计入同一预算。
 * 原现象：8192 时 finishReason=length，SSE 报「试写输出被截断」。
 */
export const STYLE_TUNING_TRIAL_WRITE_MAX_OUTPUT_TOKENS = 32768;

/**
 * 各发布场景的正文篇幅基线（字）。用户未在内容梗概中指定篇幅时以此为准。
 * 勿改回「让软调自行推断」：同一组输入（修心养性 + 固定文风卡片）实测推断值在
 * 1100–1600 与 1600–2400 之间漂移，试写就按哪个数落到哪个量级。
 */
export const SCENE_WORD_COUNT_BASELINE: Record<
  StyleTuningPublishScene,
  { min: number; max: number }
> = {
  wechat: { min: 1500, max: 2500 },
  toutiao: { min: 1200, max: 2000 },
  xiaohongshu: { min: 300, max: 600 },
  'novel-chapter': { min: 3000, max: 5000 },
  speech: { min: 1200, max: 2000 },
};
