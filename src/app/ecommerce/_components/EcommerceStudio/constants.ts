import type { DesignType, StudioFormState, StudioPhase } from './types';
import { toModelOptions } from './model-options';

export const MAX_PRODUCT_IMAGES = 6;

export const STUDIO_TITLE = '电商设计';

export const STUDIO_SUBTITLE = 'AI 商业分析到设计出图，一站式专业引导';

export const STUDIO_STEPS: { title: string }[] = [
  { title: '商业分析' },
  { title: '确认规划' },
  { title: '生成中' },
  { title: '完成' },
];

export const DESIGN_TYPE_ITEMS: {
  value: DesignType;
  label: string;
  isNew?: boolean;
}[] = [
  { value: 'main', label: '主图' },
  { value: 'detail', label: '详情图' },
  { value: 'ad', label: '广告图', isNew: true },
];

export const REQUIREMENT_LABELS: Record<DesignType, string> = {
  main: '主图要求',
  detail: '详情图要求',
  ad: '广告图要求',
};

export const REQUIREMENT_PLACEHOLDER =
  '建议填写：产品名称、核心卖点、目标人群、投放平台、画面风格、整体氛围、文案要求，便于生成更贴合的电商图';

export const DEFAULT_ASPECT_BY_TYPE: Record<DesignType, string> = {
  main: '1:1',
  detail: '3:4',
  ad: '16:9',
};

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  input: 0,
  analyzing: 0,
  analyzed: 0,
  confirm: 1,
  generating: 2,
  done: 3,
};

export const NO_IMAGE_WARNING = '请先上传产品图';
export const ANALYZE_BUTTON = '分析产品';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const SLOTS_MISSING = '请先完成产品分析';

export const EMPTY_RESULT_HINT = '上传产品资料和产品图，点击「分析产品」开始';

export const RESULT_TITLE_ANALYSIS = '分析结果';
export const RESULT_TITLE_GENERATE = '生成结果';

export const UPLOAD_SUBTITLE = '上传清晰的产品图片';

export const UPLOAD_HINT = '多图上传时建议仅上传必要的视角或 sku 图，\n干净的白底产品图最佳';

export const MAX_PRODUCT_DOCS = 6;
export const MAX_PRODUCT_DOC_BYTES = 10 * 1024 * 1024;
export const PRODUCT_DOC_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx';
export const PRODUCT_DOC_SUBTITLE = '支持图片、PDF / TXT / MD / DOCX';
export const PRODUCT_DOC_HINT = '可上传产品说明、卖点清单、品牌资料或参考图';
export const DOC_TOO_LARGE_WARNING = '单个资料不超过 10MB';
export const DOC_TYPE_WARNING = '仅支持图片、PDF、TXT、MD、DOCX';

export const PLATFORM_OPTIONS = [
  { value: 'auto', label: '智能匹配' },
  { value: 'taobao', label: '淘宝/天猫' },
  { value: 'jd', label: '京东' },
  { value: 'pdd', label: '拼多多' },
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'visual', label: '无文字(纯视觉)' },
  { value: 'zh-CN', label: '中文简体' },
  { value: 'en', label: '英文' },
];

/** 模型下拉（id + label），派生自 model-options，与服务端模型清单一致 */
export const MODEL_OPTIONS = toModelOptions();

export const ASPECT_RATIO_OPTIONS = [
  { value: '3:4', label: '3:4 竖版' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const DEFAULT_FORM_STATE: StudioFormState = {
  designType: 'main',
  platform: 'auto',
  requirement: '',
  language: 'zh-CN', // 目标语言默认中文简体
  model: 'gpt-image-2-vip', // 统一默认模型：写实/指令遵从最强、支持透明底
  aspectRatio: '1:1',
  quality: 'high', // 模型支持质量时默认高质量
  clarity: '2K', // 按模型规格默认 2K，不支持回退 1K
  count: '1', // 主图(智能匹配)默认 1
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
