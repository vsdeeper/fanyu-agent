import type { NovelPanelValues, NovelVolume, StudioPhase } from './types';

export const STUDIO_TITLE = '小说草稿';

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '故事结构' },
  { title: '写作' },
  { title: '预览' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  research: 0,
  researching: 0,
  researched: 0,
  structure: 1,
  structuring: 1,
  structured: 1,
  write: 2,
  writing: 2,
  written: 2,
  preview: 3,
};

export const GENRE_OPTIONS = [
  { label: '都市', value: '都市' },
  { label: '现实', value: '现实' },
  { label: '成长', value: '成长' },
  { label: '爱情', value: '爱情' },
  { label: '悬疑', value: '悬疑' },
  { label: '科幻', value: '科幻' },
  { label: '奇幻', value: '奇幻' },
  { label: '历史', value: '历史' },
  { label: '乡土', value: '乡土' },
  { label: '荒诞', value: '荒诞' },
] as const;

export const VOLUME_OPTIONS: { label: string; value: NovelVolume }[] = [
  { label: '短篇', value: 'short' },
  { label: '中篇', value: 'medium' },
  { label: '长篇', value: 'long' },
];

export const DEFAULT_PANEL_VALUES: NovelPanelValues = {
  idea: '',
  genres: [],
  volume: 'short',
};

export const RESEARCH_BUTTON = '开始调研';
export const STRUCTURE_BUTTON = '生成结构';
export const WRITE_BUTTON = '生成正文';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const IDEA_LABEL = '我的想法';
export const IDEA_PLACEHOLDER = '例如：小时候夏天停电，全家在院子里乘凉聊天';
export const GENRE_LABEL = '偏好类型';
export const GENRE_PLACEHOLDER = '可选，多选';
export const VOLUME_LABEL = '体量倾向';
export const SELECTED_TOPIC_LABEL = '选定选题';
export const SELECTED_TOPIC_EMPTY = '尚未选择选题';

export const MISSING_IDEA_WARNING = '请先填写我的想法';
export const MISSING_TOPIC_WARNING = '请先点选一个选题';
export const MISSING_STRUCTURE_WARNING = '请先生成故事结构';
export const MISSING_WRITE_SELECTION_WARNING = '请先选择有节拍的章节或节拍';
export const MISSING_PREVIEW_BODY_WARNING = '请先生成或填写正文后再预览';
export const EMPTY_RESEARCH_HINT = '填写想法后点击「开始调研」，将产出若干选题卡供点选';
export const EMPTY_STRUCTURE_HINT = '确认选题后点击「生成结构」，产出故事结构供编辑';
export const EMPTY_WRITE_HINT = '在左侧选择有节拍的章节或节拍';
export const EMPTY_PREVIEW_HINT = '暂无正文';
export const WRITE_UNIT_EMPTY_HINT = '点击「生成正文」后将在此流式展示；也可直接编辑';
export const WRITE_CHAR_COUNT = (count: number) => `共 ${count} 字`;
export const COPY_BODY_BUTTON = '一键复制正文';
export const COPY_BODY_OK = '已复制到剪贴板';
export const COPY_BODY_FAILED = '复制失败，请手动选择文本';
export const RESEARCH_TOPICS_TITLE = '选题卡（点选一张）';
export const RESEARCH_GENERATING_HINT = '正在生成选题…';
export const STRUCTURE_GENERATING_HINT = '正在生成故事结构…';
export const WRITE_GENERATING_HINT = '正在生成正文…';
export const STRUCTURE_PANEL_TITLE = '故事结构';
export const RESEARCH_PANEL_TITLE = '选题调研';
export const WRITE_PANEL_TITLE = '正文写作';
export const PREVIEW_PANEL_TITLE = '预览';
export const SYNOPSIS_TITLE = '一句话梗概';
export const BEATS_TITLE = '节拍';
export const CHAPTERS_TITLE = '章纲';
export const CHAPTER_PURPOSE_LABEL = '本章目的';
export const CHAPTER_TITLE_PLACEHOLDER = '章节标题';
export const CHAPTER_BEATS_LABEL = '章内节拍';
export const CHAPTER_BEATS_BUTTON = '生成节拍';
export const CHAPTER_BEATS_REGENERATE_BUTTON = '重新生成节拍';
export const CHAPTER_BEATS_EMPTY_HINT = '尚未生成节拍';
export const WRITE_UNITS_LABEL = '写作单元';
export const WRITE_CHAPTER_NO_BEATS_HINT = '请先回结构步生成节拍';
export const BEAT_DELETE_CONFIRM_TITLE = '删除这条节拍？';
export const CHAPTER_DELETE_CONFIRM_TITLE = '删除这一章？';
export const RESEARCH_REGENERATE_CONFIRM_TITLE = '重新开始调研？';
export const RESEARCH_REGENERATE_CONFIRM_CONTENT = '将覆盖当前选题及后续结构与正文';
export const STRUCTURE_REGENERATE_CONFIRM_TITLE = '重新生成故事结构？';
export const STRUCTURE_REGENERATE_CONFIRM_CONTENT = '将覆盖当前故事结构及已写正文';
export const CHAPTER_BEATS_REGENERATE_CONFIRM_TITLE = '重新生成本章节拍？';
export const CHAPTER_BEATS_REGENERATE_CONFIRM_CONTENT = '将覆盖本章已有节拍';
export const WRITE_REGENERATE_CONFIRM_TITLE = '重新生成正文？';
export const WRITE_REGENERATE_CONFIRM_CONTENT = '将覆盖已选单元的已有正文';
export const CONFIRM_OK = '继续';
export const CONFIRM_CANCEL = '取消';

export const TOPIC_SLOT_GENRE_VOLUME_LABEL = '类型与体量';
export const TOPIC_SLOT_WHY_LABEL = '为什么值得写';
export const TOPIC_SLOT_CORE_LABEL = '故事核';
export const TOPIC_SLOT_RISK_LABEL = '风险 / 难点';

/** 静态调研 / 结构 / 节拍 / 正文模拟延迟（毫秒）。 */
export const MOCK_RESEARCH_DELAY_MS = 600;
export const MOCK_STRUCTURE_DELAY_MS = 600;
export const MOCK_CHAPTER_BEATS_DELAY_MS = 600;
export const MOCK_WRITING_STREAM_STEP_MS = 40;
export const MOCK_WRITING_STREAM_STEPS = 24;
