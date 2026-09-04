import { toModelOptions } from './model-options';
import type { MultiviewFormState, ProductRetouchPhase, RefineFormState } from './types';

export const STUDIO_TITLE = '产品精修';
export const STUDIO_SUBTITLE = '产品精修与多视角生成，一站式标准化出图';
export const STUDIO_STEPS = [{ title: '产品精修' }, { title: '产品多视角' }, { title: '完成' }];
export const STUDIO_STEP_INDEX: Record<ProductRetouchPhase, number> = {
  refine: 0,
  refineGenerating: 0,
  multiview: 1,
  multiviewGenerating: 1,
  complete: 3,
};

export const DEFAULT_REFINE_REQUIREMENT =
  '保持产品外观、颜色、比例、结构完全一致；修复产品瑕疵，优化材质质感、光影、高光、阴影和边缘细节，提高商业摄影品质。背景简洁高级，突出产品主体，整体达到产品精修效果。';
export const DEFAULT_MULTIVIEW_REQUIREMENT =
  '保持产品外观完全一致，在同一画幅内生成产品正面、侧面、背面、45度、俯视、仰视等多个角度。使用纯色背景和统一光线，各视角产品比例一致；不要添加无关道具或营销装饰。';

export const DEFAULT_REFINE_FORM: RefineFormState = {
  requirement: DEFAULT_REFINE_REQUIREMENT,
  model: 'gpt-image-2-vip',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '2K',
  count: '1',
};
export const DEFAULT_MULTIVIEW_FORM: MultiviewFormState = {
  requirement: DEFAULT_MULTIVIEW_REQUIREMENT,
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
export const MULTIVIEW_NEED_OPTIONS = [
  { label: '需要', value: true },
  { label: '不需要', value: false },
];

export const NO_IMAGE_WARNING = '请先上传产品图';
export const REQUIREMENT_MISSING = '请填写生成要求';
export const REFINE_SELECT_MISSING = '请先点选一张精修图作为精修标准';
export const REFINE_RESULT_MISSING = '请先完成产品精修';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const REFINE_BUTTON = '开始精修';
export const MULTIVIEW_BUTTON = '生成产品多视角';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const REFINE_STANDARD_BADGE = '精修标准';
export const EMPTY_REFINE_HINT = '上传产品图并设置精修要求后，点击「开始精修」';
export const EMPTY_MULTIVIEW_HINT = '设置多视角要求后，点击「生成产品多视角」';
