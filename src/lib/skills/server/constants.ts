import 'server-only';

/** High：自动 Activation 并写入 sticky metadata */
export const SKILL_SCORE_HIGH = 0.7;
/** Medium：默认不激活；sticky 短 follow-up 可降阈 */
export const SKILL_SCORE_MEDIUM = 0.55;
/** sticky follow-up 字数上限（超过则不降阈） */
export const STICKY_FOLLOWUP_MAX_CHARS = 40;

/** 短 follow-up 修订线索（与字数上限合取，避免闲聊误激活） */
export const STICKY_FOLLOWUP_CUES = [
  '改',
  '换',
  '调',
  '继续',
  '确认',
  '出图',
  '生成',
  '再来',
  '就这',
  '就用',
  '直接',
  '跳过',
  '布局',
  '版式',
  '颜色',
  '色彩',
  '风格',
  '配色',
  '字体',
  '暖色',
  '冷色',
  '深色',
  '浅色',
  '网格',
  '区块',
  'hero',
  'cta',
  'logo',
] as const;
