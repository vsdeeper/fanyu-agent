import type { StudioPhase } from './types';

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '内容思路' },
  { title: '成稿写作' },
  { title: '成稿配图' },
  { title: '预览' },
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
  images: 3,
  illustrating: 3,
  illustrated: 3,
  complete: 4,
};

export const RESEARCH_BUTTON = '开始调研';
export const PLAN_BUTTON = '生成思路';
export const DRAFT_BUTTON = '生成正文';
export const PLAN_IMAGES_BUTTON = '规划配图';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const COPY_ARTICLE_BUTTON = '一键复制正文';
export const COPY_IMAGE_BUTTON = '复制图片';
export const GENERATE_SLOT_BUTTON = '生成此图';
export const UPLOAD_SLOT_BUTTON = '上传/粘贴';
export const APPLY_HISTORY_BUTTON = '填入';
export const IMAGE_HISTORY_TITLE = '旧槽位';
export const CURRENT_SLOTS_TITLE = '当前槽位';
export const IMAGE_VISUAL_STYLE_TITLE = '整套视觉约束';
export const IMAGE_VISUAL_STYLE_PLACEHOLDER =
  '规划配图后自动生成；生图时注入各槽，保证风格统一';
export const STYLE_REFERENCE_LABEL = '风格参考图';
export const STYLE_REFERENCE_SUBTITLE = '可选，规划配图时纳入视觉约束';
export const STYLE_REFERENCE_HINT = '上传一张风格参考图';
export const IMAGE_MODEL_LABEL = '模型';
export const IMAGE_ASPECT_LABEL = '比例';
export const IMAGE_CLARITY_LABEL = '清晰度';

export const MISSING_IDEA_WARNING = '请先填写我的想法';
export const MISSING_ANGLE_WARNING = '请先点选一个写作角度';
export const MISSING_PLAN_WARNING = '请先生成并确认内容思路';
export const MISSING_TITLE_WARNING = '请先点选一个标题方向作为成稿标题';
export const MISSING_STYLE_WARNING = '请至少选择一个文风卡片';
export const MISSING_MARKDOWN_WARNING = '请先生成正文';
export const MISSING_ACTIVE_SLOT_WARNING = '请先点选正文标注或槽位';
export const STYLE_LABEL = '文风';
export const DRAFT_TITLE_LABEL = '标题';
export const DRAFT_TITLE_EMPTY = '尚未选定标题';
export const LENGTH_LIMIT_LABEL = '篇幅限制';
export const LENGTH_LIMIT_PLACEHOLDER = '请输入';
export const LENGTH_LIMIT_SUFFIX = '≥字';
export const LENGTH_LIMIT_MIN = 1000;
export const LENGTH_LIMIT_MAX = 5000;
export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const IMAGES_FAILED = '配图规划失败，请稍后重试';
export const TITLE_DIRECTIONS_TITLE = '标题方向（点选一条作为成稿标题）';
export const EDIT_TITLE_BUTTON = '编辑';
export const SAVE_TITLE_BUTTON = '保存';
export const CANCEL_TITLE_BUTTON = '取消';
export const EDIT_BUTTON = '编辑';
export const SAVE_BUTTON = '保存';
export const CANCEL_BUTTON = '取消';
export const COPY_OK = '已复制到剪贴板';
export const COPY_FAILED = '复制失败，请手动选择文本';
export const COPY_IMAGE_FAILED = '复制图片失败，请右键另存';
export const GENERATE_FAILED = '配图生成失败，请稍后重试';
export const UPLOAD_FAILED = '图片上传失败，请重试';

export const EMPTY_RESEARCH_HINT = '写下想法后点击「开始调研」，将产出检索简报、参考来源与角度卡';
export const RESEARCH_PACKING_HINT = '正在整理参考来源与角度卡…';
export const EMPTY_PLAN_HINT = '确认角度后点击「生成思路」，产出轻量写作要点';
export const MIN_TITLE_DIRECTIONS = 3;
export const EMPTY_DRAFT_HINT = '选定文风后点击「生成正文」';
export const EMPTY_IMAGES_HINT = '点击「规划配图」后，正文会出现可点击的配图标注';

export const RESEARCH_BRIEF_TITLE = '检索简报';
export const RESEARCH_SOURCES_TITLE = '参考来源';
export const RESEARCH_ANGLES_TITLE = '角度卡（点选一张）';

export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';
export const DEFAULT_IMAGE_ASPECT = '3:2';
export const DEFAULT_IMAGE_CLARITY = '1K';

export const IMAGE_ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 方形' },
  { value: '3:4', label: '3:4 竖版' },
  { value: '3:2', label: '3:2 横版' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
];

export const SOURCE_KIND_LABEL = {
  fact: '事实',
  view: '观点',
  case: '案例',
} as const;

export const IMAGE_MARKER_LINE_RE = /^【配图：(.+?)】\s*$/;
