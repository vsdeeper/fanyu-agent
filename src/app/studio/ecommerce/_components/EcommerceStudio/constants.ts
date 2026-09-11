import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import { toModelOptions } from './model-options';
import type { DesignFormState, StudioFormState, StudioPhase } from './types';

export const STUDIO_TITLE = '电商设计';

export const STUDIO_SUBTITLE = 'AI 商业分析到设计出图，一站式专业引导';

export const STUDIO_STEPS: { title: string }[] = [
  { title: '商业分析' },
  { title: '营销主视觉' },
  { title: '视觉设计' },
  { title: '完成' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  input: 0,
  analyzing: 0,
  analyzed: 0,
  visual: 1,
  visualGenerating: 1,
  design: 2,
  designGenerating: 2,
  complete: 3,
};

export const NO_IMAGE_WARNING = '请先上传产品图';
export const ANALYSIS_MISSING = '请先完成产品分析';
export const VISUAL_SELECT_MISSING = '请先点选一张主视觉作为视觉标准';
export const DESIGN_RESULT_MISSING = '请先生成至少一张视觉设计';
export const MAIN_IMAGE_RESULT_MISSING = '请先生成至少一张主图';
export const POSTER_RESULT_MISSING = '请先生成至少一张营销海报';
export const ANALYSIS_UPLOAD_MISSING = '请先上传商业分析';
/** 主图任务的商业分析非必填，两者皆空时才提示 */
export const ANALYSIS_SOURCE_MISSING = '请上传商业分析或填写主图说明';
export const THEME_SELECT_MISSING = '请先点选至少一张主题卡片';
export const ANALYZE_BUTTON = '开始分析';
export const VISUAL_BUTTON = '生成营销主视觉';
export const DESIGN_BUTTON = '生成视觉设计';
export const MAIN_IMAGE_BUTTON = '生成主图';
export const DETAIL_IMAGE_BUTTON = '生成详情图';
export const POSTER_BUTTON = '生成营销海报';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const CANCEL_GENERATE_BUTTON = '取消生成';
export const CANCEL_GENERATE_CONFIRM_TITLE = '取消生成';
export const CANCEL_GENERATE_CONFIRM_DESCRIPTION =
  '已生成的图片会保留，未生成的将停止。确定取消吗？';
export const CANCEL_GENERATE_CONFIRM_OK = '取消生成';
export const CANCEL_GENERATE_CONFIRM_BACK = '继续生成';

/** 电商任务与其后台生图作业的 API 基址 */
export const ECOMMERCE_API_BASE = '/api/studio/ecommerce';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';

export const EMPTY_RESULT_HINT = '上传产品资料和产品图，点击「分析产品」开始';
export const EMPTY_VISUAL_HINT = '设置参数后点击「生成主视觉」';
export const EMPTY_MAIN_IMAGE_PLAN_HINT = '上传商业分析或填写主图说明，点击「开始分析」';
export const EMPTY_DETAIL_IMAGE_PLAN_HINT = '上传商业分析，点击「开始分析」';
export const EMPTY_MAIN_IMAGE_HINT = '设置参数后点击「生成主图」';
export const EMPTY_DETAIL_IMAGE_HINT = '设置参数后点击「生成详情图」';
export const EMPTY_POSTER_HINT = '设置参数后点击「生成营销海报」';

export const RESULT_TITLE_ANALYSIS = '分析结果';
export const RESULT_TITLE_MAIN_IMAGE_ANALYSIS = '主图分析';
export const RESULT_TITLE_DETAIL_IMAGE_ANALYSIS = '详情图分析';
export const RESULT_TITLE_VISUAL = '营销主视觉';
export const RESULT_TITLE_DESIGN = '视觉设计';
export const RESULT_TITLE_MAIN_IMAGE = '主图设计';
export const RESULT_TITLE_DETAIL_IMAGE = '详情图设计';
export const RESULT_TITLE_POSTER = '营销海报';
export const VISUAL_STANDARD_BADGE = '视觉标准';
export const PREVIOUS_SCREEN_BADGE = '上一屏';
/** 主图步点选成品作参考后的徽标：只锁画面文案的字体与配色，与主视觉步的「视觉标准」（整体风格）区分 */
export const COPY_STANDARD_BADGE = '文案标准';
export const DETAIL_IMAGE_RESULT_MISSING = '请先生成至少一张详情图';
export const EXPORT_SELECT_MISSING = '请先点选要导出的详情图';
export const MAX_MODEL_IMAGES = 1;
export const MODEL_IMAGE_SUBTITLE = '可选，锁定外貌与服装，姿势可按设计调整';
export const MODEL_IMAGE_HINT = '上传模特身份参考图（可选）';

/** 主图说明（分析步左栏自由文本，与商业分析至少填一项） */
export const MAIN_IMAGE_DESCRIPTION_LABEL = '主图说明';
export const MAIN_IMAGE_DESCRIPTION_PLACEHOLDER =
  '例如：突出轻量便携，配色走冷白，画面不要促销大字';
export const MAIN_IMAGE_DESCRIPTION_HINT = '与商业分析至少填写一项；同时用于规划主题卡与生成主图';

/** 品牌 Logo（主图分析步左栏，可选，至多一张，作出图参考图末位） */
export const MAX_BRAND_LOGOS = 1;
export const BRAND_LOGO_LABEL = '品牌 Logo';
export const BRAND_LOGO_SUBTITLE = '可选，作参考图；画面中的品牌标识以它为准';
export const BRAND_LOGO_HINT = '上传品牌 Logo 原图（透明底 PNG 最佳）';
export const BRAND_LOGO_ARIA_LABEL = '上传品牌 Logo';

/** 模型下拉（id + label），派生自 model-options，与服务端模型清单一致 */
export const MODEL_OPTIONS = toModelOptions();

export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 方形' },
  { value: '3:4', label: '3:4 竖版' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const DEFAULT_FORM_STATE: StudioFormState = {
  model: 'gpt-image-2-vip',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '2K',
  count: '1',
};

/** 电商设计任务的默认清晰度：主图/详情图 1K，营销海报 2K。 */
export const DEFAULT_CLARITY_BY_TASK_TYPE: Record<EcommerceTaskType, string> = {
  主图: '1K',
  详情图: '1K',
  营销海报: '2K',
};

export const DEFAULT_DESIGN_FORM_STATE: DesignFormState = {
  model: 'gpt-image-2-vip',
  taskType: '主图',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: DEFAULT_CLARITY_BY_TASK_TYPE['主图'],
  count: '1',
};
