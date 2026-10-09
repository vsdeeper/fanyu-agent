import { listStyleAxisLabels } from '@/app/studio/_components/StyleDimensionPicker';
import type {
  NovelCharacterGender,
  NovelCharacterRole,
  NovelLongFormat,
  NovelPanelValues,
  NovelTense,
  NovelVolume,
  StudioPhase,
} from './types';

export const STUDIO_TITLE = '小说草稿';

/** 设定步锁定的文风轴；写作步隐藏它们，避免和设定各说一遍。 */
export const NARRATOR_AXIS_LABELS = ['人称', '聚焦'] as const;

export const WRITE_HIDDEN_AXIS_LABELS: readonly string[] = NARRATOR_AXIS_LABELS;

export const BIBLE_HIDDEN_AXIS_LABELS: readonly string[] = listStyleAxisLabels().filter(
  (label) => !(NARRATOR_AXIS_LABELS as readonly string[]).includes(label),
);

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '设定' },
  { title: '故事结构' },
  { title: '写作' },
  { title: '预览' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  research: 0,
  researching: 0,
  researched: 0,
  bible: 1,
  bibling: 1,
  bibled: 1,
  structure: 2,
  structuring: 2,
  structured: 2,
  write: 3,
  writing: 3,
  written: 3,
  preview: 4,
};

export const GENRE_OPTIONS = [
  { label: '都市', value: '都市' },
  { label: '现实', value: '现实' },
  { label: '成长', value: '成长' },
  { label: '爱情', value: '爱情' },
  { label: '悬疑', value: '悬疑' },
  { label: '惊悚', value: '惊悚' },
  { label: '冒险', value: '冒险' },
  { label: '科幻', value: '科幻' },
  { label: '奇幻', value: '奇幻' },
  { label: '神话', value: '神话' },
  { label: '仙侠', value: '仙侠' },
  { label: '玄幻', value: '玄幻' },
  { label: '历史', value: '历史' },
  { label: '乡土', value: '乡土' },
  { label: '荒诞', value: '荒诞' },
] as const;

export const VOLUME_OPTIONS: { label: string; value: NovelVolume }[] = [
  { label: '短篇', value: 'short' },
  { label: '中篇', value: 'medium' },
  { label: '长篇', value: 'long' },
];

export const LONG_FORMAT_OPTIONS: { label: string; value: NovelLongFormat }[] = [
  { label: '出版', value: 'publish' },
  { label: '网文', value: 'web' },
];

export const DEFAULT_PANEL_VALUES: NovelPanelValues = {
  idea: '',
  genres: [],
  volume: 'short',
  longFormat: 'publish',
};

export const RESEARCH_BUTTON = '开始调研';
export const BIBLE_BUTTON = '生成设定';
export const STRUCTURE_BUTTON = '生成结构';
export const WRITE_BUTTON = '生成正文';
export const POLISH_BUTTON = '润色';
export const POLISH_FAILED = '润色失败，已保留当前正文';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const PREVIEW_RELATION_GRAPH_BUTTON = '预览人物关系图谱';
export const IDEA_LABEL = '我的想法';
export const IDEA_PLACEHOLDER = '例如：小时候夏天停电，全家在院子里乘凉聊天';
export const GENRE_LABEL = '偏好类型';
export const GENRE_PLACEHOLDER = '可选，多选';
export const VOLUME_LABEL = '体量倾向';
export const LONG_FORMAT_LABEL = '长篇赛道';
export const SELECTED_TOPIC_LABEL = '选定选题';
export const SELECTED_TOPIC_EMPTY = '尚未选择选题';
export const STYLE_LABEL = '文风';

export const MISSING_IDEA_WARNING = '请先填写我的想法';
export const MISSING_TOPIC_WARNING = '请先点选一个选题';
export const MISSING_BIBLE_WARNING = '请先完成设定：至少一名写全性别的人物、时空、人称、聚焦和时态';
export const MISSING_STRUCTURE_WARNING = '请先生成故事结构';
export const MISSING_WRITE_SELECTION_WARNING = '请先选择有节拍的章节或节拍';
export const MISSING_PREVIEW_BODY_WARNING = '请先生成或填写正文后再预览';
export const EMPTY_RESEARCH_HINT = '填写想法后点击「开始调研」，将产出若干选题卡供点选';
export const EMPTY_BIBLE_HINT = '确认选题后点击「生成设定」，产出核心人物、关系、时空与规矩';
export const EMPTY_STRUCTURE_HINT = '确认设定后点击「生成结构」，产出故事结构供编辑';
export const EMPTY_WRITE_HINT = '在左侧选择有节拍的章节或节拍';
export const EMPTY_PREVIEW_HINT = '暂无正文';
export const WRITE_UNIT_EMPTY_HINT = '点击「生成正文」后将在此流式展示；也可直接编辑';
export const WRITE_CHAR_COUNT = (count: number) => `共 ${count} 字`;
export const COPY_BODY_BUTTON = '一键复制正文';
export const COPY_BODY_OK = '已复制到剪贴板';
export const COPY_BODY_FAILED = '复制失败，请手动选择文本';
export const RESEARCH_TOPICS_TITLE = '选题卡（点选一张）';
export const RESEARCH_GENERATING_HINT = '正在生成选题…';
export const BIBLE_GENERATING_HINT = '正在生成设定…';
export const STRUCTURE_GENERATING_HINT = '正在生成故事结构…';
export const WRITE_GENERATING_HINT = '正在生成正文…';
export const STRUCTURE_PANEL_TITLE = '故事结构';
export const BIBLE_PANEL_TITLE = '设定';
export const RESEARCH_PANEL_TITLE = '选题调研';
export const WRITE_PANEL_TITLE = '正文写作';
export const PREVIEW_PANEL_TITLE = '预览';
export const SYNOPSIS_TITLE = '一句话梗概';
export const BEATS_TITLE = '节拍';
export const CHAPTERS_TITLE = '章纲';
export const VOLUMES_TITLE = '卷纲';
export const VOLUME_PURPOSE_LABEL = '本卷目的';
export const VOLUME_TITLE_PLACEHOLDER = '卷标题';
export const VOLUME_CHAPTERS_LABEL = '本卷章纲';
export const VOLUME_CHAPTERS_BUTTON = '生成章纲';
export const VOLUME_CHAPTERS_REGENERATE_BUTTON = '重新生成章纲';
export const VOLUME_CHAPTERS_EMPTY_HINT = '尚未生成章纲';
export const VOLUME_DELETE_CONFIRM_TITLE = '删除这一卷？';
export const VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE = '重新生成本卷章纲？';
export const VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT = '将覆盖本卷已有章纲及其中节拍与相关正文';
export const MISSING_VOLUME_CHAPTERS_WARNING = '请先至少为其中一卷生成章纲后再进入写作';
export const VOLUME_CHAPTERS_FAILED = '卷内章纲生成失败，请稍后重试';
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
export const RESEARCH_REGENERATE_CONFIRM_CONTENT = '将覆盖当前选题';
export const BIBLE_REGENERATE_CONFIRM_TITLE = '重新生成设定？';
export const BIBLE_REGENERATE_CONFIRM_CONTENT = '将覆盖当前设定及后续结构与正文';
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

export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const RESEARCH_NO_TOPICS = '未解析到选题卡，请重试调研';
export const BIBLE_FAILED = '设定生成失败，请稍后重试';
export const BIBLE_NO_CAST = '未解析到人物设定，请重试生成';
export const STRUCTURE_FAILED = '故事结构生成失败，请稍后重试';
export const CHAPTER_BEATS_FAILED = '章内节拍生成失败，请稍后重试';
export const WRITING_FAILED = '正文生成失败，请稍后重试';
export const PERSIST_FAILED = '保存失败，请稍后重试';

export const CHARACTER_ROLE_OPTIONS: { label: string; value: NovelCharacterRole }[] = [
  { label: '主角', value: 'protagonist' },
  { label: '对手', value: 'antagonist' },
  { label: '配角', value: 'supporting' },
];

export const CHARACTER_GENDER_OPTIONS: { label: string; value: NovelCharacterGender }[] = [
  { label: '女', value: 'female' },
  { label: '男', value: 'male' },
  { label: '不标明', value: 'unspecified' },
];

export const TENSE_OPTIONS: { label: string; value: NovelTense }[] = [
  { label: '过去时', value: 'past' },
  { label: '现在时', value: 'present' },
];

export const CHARACTERS_TITLE = '人物';
export const RELATIONS_TITLE = '关系';
export const TIME_PLACE_LABEL = '时空';
export const RULES_TITLE = '规矩';
export const TABOOS_TITLE = '禁忌';
export const NARRATION_TITLE = '叙述';
export const TENSE_LABEL = '时态';
export const ADD_CHARACTER_BUTTON = '添加人物';
export const ADD_RELATION_BUTTON = '添加关系';
export const ADD_RULE_BUTTON = '添加规矩';
export const ADD_TABOO_BUTTON = '添加禁忌';
export const DELETE_BUTTON = '删除';
export const CHARACTER_DELETE_CONFIRM_TITLE = '删除这个人物？';
export const RELATION_DELETE_CONFIRM_TITLE = '删除这条关系？';
export const RULE_DELETE_CONFIRM_TITLE = '删除这条规矩？';
export const TABOO_DELETE_CONFIRM_TITLE = '删除这条禁忌？';
export const CHARACTER_NAME_LABEL = '姓名';
export const CHARACTER_ROLE_LABEL = '定位';
export const CHARACTER_GENDER_LABEL = '性别';
export const CHARACTER_IDENTITY_LABEL = '身份';
export const CHARACTER_DESIRE_LABEL = '欲望';
export const CHARACTER_FLAW_LABEL = '缺陷';
export const RELATION_LABEL = '关系';
export const RELATION_FROM_LABEL = '从';
export const RELATION_TO_LABEL = '到';
