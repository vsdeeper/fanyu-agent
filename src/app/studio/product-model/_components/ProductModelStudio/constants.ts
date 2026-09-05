import { toModelOptions } from './model-options';
import type { ProductModelFormState } from './types';

export const STUDIO_TITLE = '产品模特';
export const STUDIO_SUBTITLE = '以产品与模特形象为参考，生成统一风格的多视角模特图';

export const DEFAULT_VIEW_REQUIREMENT =
  '严格使用单行四栏横向构图：左侧约占画面 40%，为胸以上正面半身特写；右侧约占 60%，平均分成三个等宽竖栏，从左到右依次为正视、侧视、背视全身自然站姿。四栏从画面顶部贯通到底部，保持同一模特、同一套造型；各视角须按正常人体比例独立生成后等比排版，不得为适配窄栏压扁、拉伸或扭曲人体，侧视人物的手臂、躯干和双腿须自然完整；禁止将右侧三视角排成 2×2 宫格或上下两排。';

export const DEFAULT_FORM: ProductModelFormState = {
  viewRequirement: DEFAULT_VIEW_REQUIREMENT,
  model: 'gpt-image-2-vip',
  aspectRatio: '16:9',
  quality: 'high',
  clarity: '2K',
  count: '1',
};

export const MODEL_OPTIONS = toModelOptions();
export const ASPECT_RATIO_OPTIONS = [
  { value: '3:4', label: '3:4 竖版' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const MAX_MODEL_IMAGES = 3;
export const PRODUCT_IMAGE_SUBTITLE = '识别品类，并参考视觉、气质与风格';
export const MODEL_IMAGE_SUBTITLE = '可选，用于锁定同一人物的身份与外貌';
export const GENERATE_BUTTON = '生成产品模特';
export const EMPTY_RESULT_HINT = '上传产品图并设置视角要求后，点击「生成产品模特」';
export const NO_IMAGE_WARNING = '请先上传产品图';
export const REQUIREMENT_MISSING = '请填写视角要求';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const EXPORT_BUTTON = '导出全部';
export const EXPORT_ARCHIVE_NAME = '产品模特成果.zip';
export const EXPORT_FAILED = '导出失败，请稍后重试';

export const IMAGE_EXTENSION_BY_MEDIA_TYPE: Readonly<Record<string, string>> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
