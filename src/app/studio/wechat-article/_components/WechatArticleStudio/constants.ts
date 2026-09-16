import type { StudioPhase } from './types';
import { getModelCapability } from '@/app/studio/_utils/model-options';

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '内容思路' },
  { title: '成稿写作' },
  { title: '预览发布物料' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  research: 0,
  researching: 0,
  researched: 0,
  plan: 1,
  planning: 1,
  planned: 1,
  draft: 2,
  drafting: 2,
  drafted: 2,
  complete: 3,
};

export const RESEARCH_BUTTON = '开始调研';
export const PLAN_BUTTON = '生成思路';
export const DRAFT_BUTTON = '生成正文';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const COPY_ARTICLE_BUTTON = '一键复制正文';
export const COPY_IMAGE_BUTTON = '复制图片';
export const GENERATE_SLOT_BUTTON = '生成此图';

export const MISSING_IDEA_WARNING = '请先填写一句话想法';
export const MISSING_ANGLE_WARNING = '请先点选一个写作角度';
export const MISSING_PLAN_WARNING = '请先生成并确认内容思路';
export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const COPY_OK = '已复制到剪贴板';
export const COPY_FAILED = '复制失败，请手动选择文本';
export const COPY_IMAGE_FAILED = '复制图片失败，请右键另存';
export const GENERATE_FAILED = '配图生成失败，请稍后重试';

export const EMPTY_RESEARCH_HINT = '写下想法后点击「开始调研」，将产出检索简报、参考来源与角度卡';
export const RESEARCH_PACKING_HINT = '正在整理参考来源与角度卡…';
export const EMPTY_PLAN_HINT = '确认角度后点击「生成思路」，产出轻量写作要点';
export const EMPTY_DRAFT_HINT = '确认思路后点击「生成正文」；配图槽需手动触发生成';

export const RESEARCH_SOURCES_TITLE = '参考来源';
export const RESEARCH_ANGLES_TITLE = '角度卡（点选一张）';

export const STYLE_SAMPLES_PLACEHOLDER =
  '粘贴你认可的旧文或目标口吻段落，1～3 段。有样本时成稿优先对齐其句式与用词。';

export const DEFAULT_IMAGE_MODEL = 'gpt-image-2-vip';
export const DEFAULT_IMAGE_ASPECT = '3:2';
export const DEFAULT_IMAGE_CLARITY =
  getModelCapability(DEFAULT_IMAGE_MODEL)?.clarityDefault ?? '2K';

export const SOURCE_KIND_LABEL = {
  fact: '事实',
  view: '观点',
  case: '案例',
} as const;
