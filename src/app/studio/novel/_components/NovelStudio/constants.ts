import {
  NOVEL_MAX_IDEA_FILES,
  NOVEL_MAX_PLAN_FILES,
} from '@/app/api/studio/novel/_shared/idea-file';
import type {
  NovelCharacterGender,
  NovelCharacterRole,
  NovelPanelValues,
  NovelTense,
  StudioPhase,
} from './types';

export const STUDIO_TITLE = '小说草稿';

/** 写作步锁定的叙述轴，和其余文风轴一起选。 */
export const NARRATOR_AXIS_LABELS = ['人称', '聚焦'] as const;

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '创作方案' },
  { title: '角色设定' },
  { title: '卷章设计' },
  { title: '写作' },
  { title: '预览' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  research: 0,
  researching: 0,
  researched: 0,
  plan: 1,
  planning: 1,
  planned: 1,
  cast: 2,
  casting: 2,
  casted: 2,
  chapters: 3,
  chaptering: 3,
  chaptered: 3,
  write: 4,
  writing: 4,
  written: 4,
  preview: 5,
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

export const DEFAULT_PANEL_VALUES: NovelPanelValues = {
  idea: '',
  ideaFiles: [],
  planFiles: [],
  genres: [],
};

export const RESEARCH_BUTTON = '开始调研';
export const PLAN_BUTTON = '生成创作方案';
export const CAST_BUTTON = '生成角色';
export const WRITE_BUTTON = '生成正文';
export const POLISH_BUTTON = '润色';
export const POLISH_FAILED = '润色失败，已保留当前正文';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const PREVIEW_RELATION_GRAPH_BUTTON = '预览人物关系图谱';
export const IDEA_LABEL = '我的想法';
export const IDEA_PLACEHOLDER = '例如：小时候夏天停电，全家在院子里乘凉聊天';
export const IDEA_FILE_LABEL = '体系设定';
export const IDEA_FILE_SUBTITLE = '支持 TXT / MD / PDF';
export const IDEA_FILE_HINT = '必填。上传世界观、地理、势力或规则；最多三份';
export const IDEA_FILE_ACCEPT = '.txt,.md,.pdf';
export const IDEA_FILE_TYPE_WARNING = '仅支持 TXT、MD、PDF';
export const IDEA_FILE_MAX = NOVEL_MAX_IDEA_FILES;
export const IDEA_FILE_READ_FAILED = '体系设定无法读取，请重新上传';
export const PLAN_FILE_LABEL = '创作方案';
export const PLAN_FILE_SUBTITLE = '支持 TXT / MD / PDF';
export const PLAN_FILE_HINT =
  '可选。作为样本：已写明的主线、人物和事件会保持，没写到的部分按长篇需要补全';
export const PLAN_FILE_MAX = NOVEL_MAX_PLAN_FILES;
export const PLAN_FILE_READ_FAILED = '创作方案无法读取，请重新上传';
export const GENRE_LABEL = '偏好类型';
export const GENRE_PLACEHOLDER = '可选，多选';
export const SELECTED_TOPIC_LABEL = '选定选题';
export const SELECTED_TOPIC_EMPTY = '尚未选择选题';
export const STYLE_LABEL = '文风';
export const REASONING_EFFORT_LABEL = '思考强度';
export const REASONING_EFFORT_OPTION_LABEL: Record<'none' | 'low' | 'high' | 'max', string> = {
  none: '关闭',
  low: '低',
  high: '高',
  max: '最高',
};

export const MISSING_IDEA_WARNING = '请上传体系设定';
export const MISSING_TOPIC_WARNING = '请先点选一个选题';
export const MISSING_PLAN_WARNING = '请先完成创作方案：主线 2～4 条，且每卷都写了本卷结果';
export const MISSING_CAST_WARNING = '请先完成角色：至少一名写全性别、出身和特质的人物';
export const MISSING_CHAPTERS_WARNING = '请先至少为一卷生成章卡后再进入写作';
export const MISSING_WRITE_SELECTION_WARNING = '请先选择要写作的章节';
export const WRITE_SEQUENCE_WARNING = '请先按顺序完成前面的章节';
export const MISSING_NARRATION_WARNING = '请先选定人称、聚焦和时态';
export const MISSING_PREVIEW_BODY_WARNING = '请先生成或填写正文后再预览';
export const EMPTY_RESEARCH_HINT = '上传体系设定后点击「开始调研」，将产出若干选题卡供点选';
export const EMPTY_PLAN_HINT = '确认选题后点击「生成创作方案」，产出主线与分卷';
export const EMPTY_CAST_HINT = '确认方案后点击「生成角色」，产出核心人物与关系';
export const EMPTY_CHAPTERS_HINT = '确认角色后点击「生成章卡」，按卷产出场景、事件和钩子';
export const EMPTY_WRITE_HINT = '在左侧选择章节';
export const EMPTY_PREVIEW_HINT = '暂无正文';
export const WRITE_UNIT_EMPTY_HINT = '点击「生成正文」后将在此流式展示；也可直接编辑';
export const WRITE_CHAR_COUNT = (count: number) => `共 ${count} 字`;
export const COPY_BODY_BUTTON = '一键复制正文';
export const COPY_BODY_OK = '已复制到剪贴板';
export const COPY_BODY_FAILED = '复制失败，请手动选择文本';
export const RESEARCH_TOPICS_TITLE = '选题卡（点选一张）';
export const RESEARCH_GENERATING_HINT = '正在生成选题…';
export const PLAN_GENERATING_HINT = '正在生成创作方案…';
export const CAST_GENERATING_HINT = '正在生成角色…';
export const CHAPTERS_GENERATING_HINT = '正在生成本卷章卡…';
export const WRITE_GENERATING_HINT = '正在生成正文…';
export const PLAN_PANEL_TITLE = '创作方案';
export const PLAN_EXPORT_BUTTON = '导出';
export const PLAN_EXPORT_FILE_NAME = '创作方案.md';
export const PLAN_EXPORT_MEDIA_TYPE = 'text/markdown;charset=utf-8';
export const PLAN_IMPORT_CONFIRM_TITLE = '导入并覆盖创作方案？';
export const PLAN_IMPORT_CONFIRM_CONTENT = '将覆盖当前创作方案，不修改已有角色、卷章与正文';
export const CAST_PANEL_TITLE = '角色设定';
export const CAST_EXPORT_BUTTON = '导出';
export const CAST_EXPORT_FILE_NAME = '角色设定.md';
export const CAST_EXPORT_MEDIA_TYPE = 'text/markdown;charset=utf-8';
export const CAST_IMPORT_CONFIRM_TITLE = '导入并覆盖角色设定？';
export const CAST_IMPORT_CONFIRM_CONTENT = '将覆盖当前角色，不修改已有创作方案、卷章与正文';
export const CHAPTERS_PANEL_TITLE = '卷章设计';
export const CHAPTERS_EXPORT_BUTTON = '导出';
export const CHAPTERS_EXPORT_FILE_NAME = '卷章设计.md';
export const CHAPTERS_EXPORT_MEDIA_TYPE = 'text/markdown;charset=utf-8';
export const CHAPTERS_IMPORT_CONFIRM_TITLE = '导入并覆盖卷章设计？';
export const CHAPTERS_IMPORT_CONFIRM_CONTENT = '将覆盖当前章卡，不修改已有正文';
export const NOVEL_IMPORT_BUTTON = '导入';
export const NOVEL_IMPORT_ACCEPT = '.md,text/markdown';
export const NOVEL_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const NOVEL_MARKDOWN_EXPORT_VERSION = 2;
export const NOVEL_IMPORT_SUCCESS = '导入成功';
export const NOVEL_IMPORT_SAVE_FAILED = '导入保存失败，请稍后重试';
export const NOVEL_IMPORT_TYPE_WARNING = '请选择 Markdown 文件';
export const NOVEL_IMPORT_TOO_LARGE_WARNING = '导入文件不能超过 2 MB';
export const NOVEL_IMPORT_MISSING_PAYLOAD = '文件不含可导入的凡域数据';
export const NOVEL_IMPORT_WRONG_TYPE = '文件类型与当前步骤不匹配';
export const NOVEL_IMPORT_UNSUPPORTED_VERSION = '文件版本暂不支持';
export const NOVEL_IMPORT_INVALID_PAYLOAD = '文件中的导入数据无效';
export const RESEARCH_PANEL_TITLE = '选题调研';
export const WRITE_PANEL_TITLE = '正文写作';
export const PREVIEW_PANEL_TITLE = '预览';
export const THREADS_TITLE = '核心主线';
export const THREAD_NAME_LABEL = '名称';
export const THREAD_CORE_LABEL = '核心悬念或矛盾';
export const THREAD_ADVANCE_LABEL = '本卷推进';
export const VOLUMES_TITLE = '分卷结构';
export const VOLUME_TITLE_PLACEHOLDER = '卷标题';
export const VOLUME_GEOGRAPHY_LABEL = '范围';
export const VOLUME_CONFLICT_LABEL = '核心冲突';
export const VOLUME_OUTCOME_LABEL = '本卷结果';
export const VOLUME_TARGET_CHARS_LABEL = '目标字数';
export const VOLUME_TARGET_CHARS_SUFFIX = '字';
export const VOLUME_CHAPTERS_LABEL = '本卷章卡';
export const CHAPTERS_BUTTON = '生成章卡';
export const CHAPTERS_REGENERATE_CONFIRM_TITLE = '重新生成全部章卡？';
export const CHAPTERS_REGENERATE_CONFIRM_CONTENT = '将覆盖各卷已有章卡及其中相关正文';
export const VOLUME_CHAPTERS_BUTTON = '生成本卷章卡';
export const VOLUME_CHAPTERS_REGENERATE_BUTTON = '重新生成本卷章卡';
export const VOLUME_CHAPTERS_EMPTY_HINT = '尚未生成本卷章卡';
export const VOLUME_DELETE_CONFIRM_TITLE = '删除这一卷？';
export const VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE = '重新生成本卷章卡？';
export const VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT = '将覆盖本卷已有章卡及其中相关正文';
export const VOLUME_CHAPTERS_FAILED = '卷章设计生成失败，请稍后重试';
export const CHAPTER_SCENE_LABEL = '场景';
export const CHAPTER_EVENT_LABEL = '事件';
export const CHAPTER_HOOK_LABEL = '钩子';
export const CHAPTER_TITLE_PLACEHOLDER = '章节标题';
export const CHAPTER_HOOK_HINT = '悬念、冲突、发现三者之一';
export const WRITE_UNITS_LABEL = '章节';
export const CHAPTER_DELETE_CONFIRM_TITLE = '删除这一章？';
export const RESEARCH_REGENERATE_CONFIRM_TITLE = '重新开始调研？';
export const RESEARCH_REGENERATE_CONFIRM_CONTENT = '将覆盖当前选题';
export const PLAN_REGENERATE_CONFIRM_TITLE = '重新生成创作方案？';
export const PLAN_REGENERATE_CONFIRM_CONTENT = '将覆盖当前方案及后续角色、卷章与正文';
export const CAST_REGENERATE_CONFIRM_TITLE = '重新生成角色？';
export const CAST_REGENERATE_CONFIRM_CONTENT = '将覆盖当前角色及后续卷章与正文';
export const WRITE_REGENERATE_CONFIRM_TITLE = '重新生成正文？';
export const WRITE_REGENERATE_CONFIRM_CONTENT =
  '将覆盖当前正文；若后续章节已经生成，它们与本章的衔接可能需要重新调整';
export const CONFIRM_OK = '继续';
export const CONFIRM_CANCEL = '取消';

export const TOPIC_TITLE_LABEL = '选题标题';
export const TOPIC_SLOT_GENRE_VOLUME_LABEL = '类型';
export const TOPIC_SLOT_WHY_LABEL = '为什么值得写';
export const TOPIC_SLOT_CORE_LABEL = '故事核';
export const TOPIC_SLOT_RISK_LABEL = '风险 / 难点';

export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const RESEARCH_NO_TOPICS = '未解析到选题卡，请重试调研';
export const PLAN_FAILED = '创作方案生成失败，请稍后重试';
export const PLAN_NO_PAYLOAD = '未解析到创作方案，请重试生成';
export const CAST_FAILED = '角色设定生成失败，请稍后重试';
export const CAST_NO_CAST = '未解析到人物，请重试生成';
export const PERSIST_FAILED = '保存失败，请稍后重试';
export const WRITING_FAILED = '正文生成失败，请稍后重试';

export const CHARACTER_ROLE_OPTIONS: { label: string; value: NovelCharacterRole }[] = [
  { label: '主角', value: 'protagonist' },
  { label: '对手', value: 'antagonist' },
  { label: '配角', value: 'supporting' },
];

export const CHARACTER_GENDER_OPTIONS: { label: string; value: NovelCharacterGender }[] = [
  { label: '女', value: 'female' },
  { label: '男', value: 'male' },
];

export const TENSE_OPTIONS: { label: string; value: NovelTense }[] = [
  { label: '过去时', value: 'past' },
  { label: '现在时', value: 'present' },
];

export const CHARACTERS_TITLE = '人物';
export const RELATIONS_TITLE = '关系';
export const NARRATION_TITLE = '叙述';
export const TENSE_LABEL = '时态';
export const ADD_CHARACTER_BUTTON = '添加人物';
export const ADD_RELATION_BUTTON = '添加关系';
export const ADD_THREAD_BUTTON = '添加主线';
export const ADD_VOLUME_BUTTON = '添加分卷';
export const DELETE_BUTTON = '删除';
export const CHARACTER_DELETE_CONFIRM_TITLE = '删除这个人物？';
export const RELATION_DELETE_CONFIRM_TITLE = '删除这条关系？';
export const THREAD_DELETE_CONFIRM_TITLE = '删除这条主线？';
export const CHARACTER_NAME_LABEL = '姓名';
export const CHARACTER_ROLE_LABEL = '定位';
export const CHARACTER_GENDER_LABEL = '性别';
export const CHARACTER_ORIGIN_LABEL = '出身';
export const CHARACTER_TRAIT_LABEL = '特质';
export const CHARACTER_ARC_LABEL = '变化';
export const ARC_EARLY_LABEL = '初期';
export const ARC_MID_LABEL = '中期';
export const ARC_LATE_LABEL = '后期';
export const ARC_END_LABEL = '终局';
export const RELATION_LABEL = '关系';
export const RELATION_FROM_LABEL = '从';
export const RELATION_TO_LABEL = '到';
