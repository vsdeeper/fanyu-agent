/** 发布场景枚举值。 */
export const STYLE_TUNING_PUBLISH_SCENES = [
  'wechat',
  'toutiao',
  'xiaohongshu',
  'novel-chapter',
  'speech',
] as const;

/** 文风调工作室 SSE 事件名（softtune / trialwrite 共用）。 */
export const STYLE_TUNING_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;
