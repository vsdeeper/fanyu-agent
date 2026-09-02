import type { DesignType, StudioFormState } from './types';

export const MAX_PRODUCT_IMAGES = 6;

export const STUDIO_TITLE = 'AI帮写需求，一键生成详情图组';

export const STUDIO_SUBTITLE =
  '上传产品图，AI 智能分析并帮写拍摄需求，自动生成多角度、多场景的电商详情图组';

export const STUDIO_STEPS = [
  { title: '输入' },
  { title: '分析中' },
  { title: '确认规划' },
  { title: '生成中' },
  { title: '完成' },
] as const;

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
  '建议填写：产品名称、核心卖点、目标人群、投放平台、画面风格等，便于生成更贴合的电商图';

export const COMING_SOON_MESSAGE = '功能即将开放';

export const EMPTY_RESULT_HINT = '上传产品图并填写要求后 点击「分析产品」开始';

export const UPLOAD_HINT = '多图上传时建议仅上传必要的视角或 sku 图，干净的白底产品图最佳';

export const RETOUCH_HINT = '没有白底图？去精修获得白底图';

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

export const MODEL_OPTIONS = [
  { value: 'gpt-image-2-vip', label: 'GPT Image 2 VIP' },
  { value: 'gemini-3.1-flash-image', label: 'Gemini Flash Image' },
  { value: 'gemini-3.1-flash-lite-image', label: 'Gemini Flash Lite Image' },
  { value: 'doubao-seedream-4-5-251128', label: 'Seedream 4.5' },
  { value: 'doubao-seedream-5-0-lite-260128', label: 'Seedream' },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: '3:4', label: '3:4 竖版' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const QUALITY_OPTIONS = [
  { value: 'medium', label: '中等质量' },
  { value: 'high', label: '高质量' },
  { value: 'low', label: '低质量' },
];

export const CLARITY_OPTIONS = [
  { value: '1K', label: '1K 标准' },
  { value: '2K', label: '2K 高清' },
  { value: '4K', label: '4K 超清' },
];

export const COUNT_OPTIONS = [
  { value: '1', label: '1 张' },
  { value: '2', label: '2 张' },
  { value: '4', label: '4 张' },
  { value: '8', label: '8 张' },
];

export const DEFAULT_FORM_STATE: StudioFormState = {
  designType: 'main',
  platform: 'auto',
  requirement: '',
  language: 'visual',
  model: 'gpt-image-2-vip',
  aspectRatio: '3:4',
  quality: 'medium',
  clarity: '1K',
  count: '1',
};

export const PRODUCT_IMAGE_ACCEPT = 'image/*';
