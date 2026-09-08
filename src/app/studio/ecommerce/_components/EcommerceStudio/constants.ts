import type { DesignFormState, StudioFormState, StudioPhase } from './types';
import { toModelOptions } from './model-options';

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
export const THEME_SELECT_MISSING = '请先点选至少一张主题卡片';
export const ANALYZE_BUTTON = '开始分析';
export const MAIN_IMAGE_ANALYZE_BUTTON = '开始主图分析';
export const DETAIL_IMAGE_ANALYZE_BUTTON = '开始规划';
export const VISUAL_BUTTON = '生成营销主视觉';
export const DESIGN_BUTTON = '生成视觉设计';
export const MAIN_IMAGE_BUTTON = '生成主图';
export const DETAIL_IMAGE_BUTTON = '生成详情图';
export const POSTER_BUTTON = '生成营销海报';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';

export const EMPTY_RESULT_HINT = '上传产品资料和产品图，点击「分析产品」开始';
export const EMPTY_VISUAL_HINT = '设置参数后点击「生成主视觉」';
export const EMPTY_DESIGN_HINT = '设置视觉设计参数后点击「生成视觉设计」';
export const EMPTY_MAIN_IMAGE_PLAN_HINT = '上传商业分析，点击「开始主图分析」';
export const EMPTY_DETAIL_IMAGE_PLAN_HINT = '上传商业分析，点击「开始规划」';
export const EMPTY_MAIN_IMAGE_HINT = '设置参数后点击「生成主图」';
export const EMPTY_DETAIL_IMAGE_HINT = '设置参数后点击「生成详情图」';
export const EMPTY_POSTER_HINT = '设置参数后点击「生成营销海报」';

export const RESULT_TITLE_ANALYSIS = '分析结果';
export const RESULT_TITLE_MAIN_IMAGE_ANALYSIS = '主图分析';
export const RESULT_TITLE_DETAIL_IMAGE_PLAN = '结构规划';
export const RESULT_TITLE_VISUAL = '营销主视觉';
export const RESULT_TITLE_DESIGN = '视觉设计';
export const RESULT_TITLE_MAIN_IMAGE = '主图设计';
export const RESULT_TITLE_DETAIL_IMAGE = '详情图设计';
export const RESULT_TITLE_POSTER = '营销海报';
export const VISUAL_STANDARD_BADGE = '视觉标准';
export const PREVIOUS_SCREEN_BADGE = '上一屏';
export const DETAIL_IMAGE_RESULT_MISSING = '请先生成至少一张详情图';
export const EXPORT_SELECT_MISSING = '请先点选要导出的详情图';
export const MAX_MODEL_IMAGES = 1;
export const MODEL_IMAGE_SUBTITLE = '可选，锁定外貌与服装，姿势可按设计调整';
export const MODEL_IMAGE_HINT = '上传模特身份参考图（可选）';

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

export const DEFAULT_DESIGN_FORM_STATE: DesignFormState = {
  model: 'gpt-image-2-vip',
  taskType: '主图',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '2K',
  count: '1',
};
