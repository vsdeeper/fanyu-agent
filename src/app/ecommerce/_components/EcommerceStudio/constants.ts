import type {
  DesignFormState,
  ModelFormState,
  ProductViewFormState,
  StudioFormState,
  StudioPhase,
} from './types';
import {
  DEFAULT_MODEL_REQUIREMENT,
  ECOMMERCE_DESIGN_TYPES,
} from '@/app/api/ecommerce/_shared/constants';
import { toModelOptions } from './model-options';

export const MAX_PRODUCT_IMAGES = 6;

export const STUDIO_TITLE = '电商设计';

export const STUDIO_SUBTITLE = 'AI 商业分析到设计出图，一站式专业引导';

export const STUDIO_STEPS: { title: string }[] = [
  { title: '商业分析' },
  { title: '产品多视角' },
  { title: '营销主视觉' },
  { title: '模特多视角' },
  { title: '视觉设计' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  input: 0,
  analyzing: 0,
  analyzed: 0,
  productView: 1,
  productViewGenerating: 1,
  visual: 2,
  visualGenerating: 2,
  model: 3,
  modelGenerating: 3,
  design: 4,
  designGenerating: 4,
};

export const NO_IMAGE_WARNING = '请先上传产品图';
export const ANALYSIS_MISSING = '请先完成产品分析';
export const PRODUCT_VIEW_SELECT_MISSING = '请先点选一张产品多视角图作为产品标准';
export const VISUAL_SELECT_MISSING = '请先点选一张主视觉作为视觉标准';
export const MODEL_SELECT_MISSING = '请先点选一张模特图作为模特标准';
export const ANALYZE_BUTTON = '开始分析';
export const PRODUCT_VIEW_BUTTON = '生成产品多视角';
export const VISUAL_BUTTON = '生成营销主视觉';
export const MODEL_BUTTON = '生成模特多视角';
export const DESIGN_BUTTON = '生成视觉设计';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const MODEL_HELP_WRITE_FAILED = '模特要求生成失败，请稍后重试';

export const EMPTY_RESULT_HINT = '上传产品资料和产品图，点击「分析产品」开始';
export const EMPTY_PRODUCT_VIEW_HINT = '设置参数后点击「生成产品」';
export const EMPTY_VISUAL_HINT = '设置参数后点击「生成主视觉」';
export const EMPTY_MODEL_HINT = '可上传模特形象，填写要求后点击「生成模特」';
export const EMPTY_DESIGN_HINT = '设置视觉设计参数后点击「生成视觉设计」';

export const RESULT_TITLE_ANALYSIS = '分析结果';
export const RESULT_TITLE_PRODUCT_VIEW = '产品多视角';
export const RESULT_TITLE_VISUAL = '营销主视觉';
export const RESULT_TITLE_MODEL = '产品模特';
export const RESULT_TITLE_DESIGN = '视觉设计';
export const PRODUCT_STANDARD_BADGE = '产品标准';
export const VISUAL_STANDARD_BADGE = '视觉标准';
export const MODEL_STANDARD_BADGE = '模特标准';

export const UPLOAD_SUBTITLE = '上传清晰的产品图片';

export const UPLOAD_HINT = '多图上传时建议仅上传必要的视角或 sku 图，\n干净的白底产品图最佳';

export const MAX_PRODUCT_DOCS = 6;
export const MAX_PRODUCT_DOC_BYTES = 10 * 1024 * 1024;
export const PRODUCT_DOC_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx';
export const PRODUCT_DOC_SUBTITLE = '支持图片、PDF / TXT / MD / DOCX';
export const PRODUCT_DOC_HINT = '可上传产品说明、卖点清单、品牌资料或参考图';
export const DOC_TOO_LARGE_WARNING = '单个资料不超过 10MB';
export const DOC_TYPE_WARNING = '仅支持图片、PDF、TXT、MD、DOCX';

export const MAX_MODEL_IMAGES = 3;
export const MODEL_UPLOAD_SUBTITLE = '可上传同一模特的不同角度照片';
export const MODEL_UPLOAD_HINT = '用于共同锁定人物外貌，不沿用照片中的姿态';
export const MODEL_REQUIREMENT_PLACEHOLDER =
  '建议填写：性别、年龄、气质与发型；可穿戴品说明穿戴方式，非穿戴品注明画面不出现产品';

/** 模型下拉（id + label），派生自 model-options，与服务端模型清单一致 */
export const MODEL_OPTIONS = toModelOptions();

export const ASPECT_RATIO_OPTIONS = [
  { value: '3:4', label: '3:4 竖版' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const DESIGN_TYPE_OPTIONS = ECOMMERCE_DESIGN_TYPES.map((value) => ({
  value,
  label: value,
}));

export const BOOLEAN_OPTIONS = [
  { value: true, label: '是' },
  { value: false, label: '否' },
];

export const DEFAULT_FORM_STATE: StudioFormState = {
  model: 'gpt-image-2-vip',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '2K',
  count: '1',
};

export const DEFAULT_PRODUCT_VIEW_FORM_STATE: ProductViewFormState = {
  model: 'gpt-image-2-vip',
  aspectRatio: '16:9',
  quality: 'high',
  clarity: '2K',
  count: '1',
};

export const DEFAULT_MODEL_FORM_STATE: ModelFormState = {
  modelRequirement: DEFAULT_MODEL_REQUIREMENT,
  model: 'gpt-image-2-vip',
  aspectRatio: '16:9',
  quality: 'high',
  clarity: '2K',
  count: '1',
};

export const DEFAULT_DESIGN_FORM_STATE: DesignFormState = {
  model: 'gpt-image-2-vip',
  designType: '主图',
  aspectRatio: '1:1',
  referenceVisual: true,
  includeModel: true,
  quality: 'high',
  clarity: '2K',
  count: '1',
};

export const PRODUCT_IMAGE_ACCEPT = 'image/*';

export const PRODUCT_DOC_EXT_SET = new Set([
  'pdf',
  'txt',
  'md',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
]);

export const PRODUCT_DOC_IMAGE_EXT_SET = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
