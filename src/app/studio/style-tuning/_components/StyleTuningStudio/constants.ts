import type { StyleTuningPublishScene } from '@/app/api/studio/style-tuning/_shared/types';
import type { SoftParamFieldKey, StudioPhase } from './types';

export const STUDIO_STEPS = [{ title: '软调' }, { title: '试写' }];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  softtune: 0,
  softtuning: 0,
  softtuned: 0,
  trialwrite: 1,
  trialwriting: 1,
  trialwritten: 1,
};

export const SOFT_TUNE_BUTTON = '生成软调参数';
export const TRIAL_WRITE_BUTTON = '开始试写';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const AI_ASSIST_BUTTON = 'AI 帮写';
export const AI_ASSIST_MODAL_TITLE = '根据文风样本生成文风提示词';
export const AI_ASSIST_GENERATE_BUTTON = '生成';
export const AI_ASSIST_CANCEL_BUTTON = '取消';

export const MISSING_SCENE_WARNING = '请先选择发布场景';
export const MISSING_TOPIC_CONTENT_WARNING = '请先填写主题内容';
export const MISSING_STYLE_PROMPT_WARNING = '请先填写文风提示词';
export const MISSING_SOFT_PARAMS_WARNING = '请先生成并确认六维软调参数';
export const MISSING_STYLE_SAMPLES_WARNING = '请先粘贴文风样本';
export const SOFT_TUNE_FAILED = '软调参数生成失败，请稍后重试';
export const TRIAL_WRITE_FAILED = '试写失败，请稍后重试';
export const SOFT_PARAMS_PARSE_FAILED = '软调参数解析失败，请重试生成';
export const ASSIST_STYLE_PROMPT_FAILED = '文风提示词生成失败，请稍后重试';

export const EMPTY_SOFT_TUNE_HINT =
  '选择发布场景并填写主题内容、文风提示词后，点击「生成软调参数」';
export const EMPTY_TRIAL_WRITE_HINT =
  '可填写内容梗概后点击「开始试写」；梗概为空时将围绕主题内容生成样文';

export const SOFT_TUNE_RESULT_TITLE = '六维软参数';
export const TRIAL_WRITE_RESULT_TITLE = '试写正文';
export const TOPIC_CONTENT_PLACEHOLDER = '本次要写的主题、核心观点或故事主线';
export const STYLE_PROMPT_PLACEHOLDER =
  '例如：你是一个做了十年情感专栏的编辑，说话像朋友聊天，但每段结尾会轻轻扎一下。也可点「AI 帮写」根据样本生成。';
export const CONTENT_OUTLINE_PLACEHOLDER =
  '可选：情节走向、必须包含的关键词、目标字数等；留空则围绕主题内容自行展开';
export const STYLE_SAMPLES_MODAL_PLACEHOLDER =
  '粘贴认可的文风段落，多段可用空行分隔。将据此从叙事姿态、情感质地、语言质地、空间与视角、主题风格五维生成文风提示词。';

export const PUBLISH_SCENE_OPTIONS: Array<{ value: StyleTuningPublishScene; label: string }> = [
  { value: 'wechat', label: '公众号' },
  { value: 'toutiao', label: '头条' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'novel-chapter', label: '小说章节' },
  { value: 'speech', label: '演讲稿' },
];

export const SOFT_PARAM_FIELDS: Array<{ key: SoftParamFieldKey; label: string }> = [
  { key: 'rolePersona', label: '1. 角色与人格' },
  { key: 'viewpointNarration', label: '2. 视角与人称' },
  { key: 'languageTexture', label: '3. 语言质感' },
  { key: 'rhythmStructure', label: '4. 节奏与结构' },
  { key: 'emotionTemperature', label: '5. 情绪温度' },
  { key: 'goalsConstraints', label: '6. 目标与约束' },
];

export const EMPTY_SOFT_PARAMS = {
  rolePersona: '',
  viewpointNarration: '',
  languageTexture: '',
  rhythmStructure: '',
  emotionTemperature: '',
  goalsConstraints: '',
} as const;
