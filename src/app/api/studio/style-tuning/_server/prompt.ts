import 'server-only';

import type {
  StyleTuningPublishScene,
  StyleTuningSoftParams,
  StyleTuningSoftTuneRequest,
  StyleTuningTrialWriteRequest,
} from '../_shared/types';
import { SCENE_WORD_COUNT_BASELINE } from './constants';

const SCENE_LABEL: Record<StyleTuningPublishScene, string> = {
  wechat: '公众号',
  toutiao: '头条',
  xiaohongshu: '小红书',
  'novel-chapter': '小说章节',
  speech: '演讲稿',
};

/** 构造软调用户提示。 */
export function buildSoftTunePrompt(body: StyleTuningSoftTuneRequest): string {
  const baseline = SCENE_WORD_COUNT_BASELINE[body.publishScene];
  return [
    `## 发布场景\n${SCENE_LABEL[body.publishScene]}（${body.publishScene}）`,
    `## 篇幅基线\n正文 ${baseline.min}–${baseline.max} 字，取此区间，不得自行另定`,
    `## 主题内容\n${body.topicContent.trim()}`,
    `## 文风\n${body.stylePrompt.trim()}`,
    '',
    '请按 instructions 输出六维软参数 Markdown，并以 JSON 代码块收尾。',
  ]
    .filter((part) => part !== '')
    .join('\n\n');
}

/** 格式化六维软参数供试写注入。 */
function formatSoftParams(params: StyleTuningSoftParams): string {
  return [
    `1. 角色与人格：${params.rolePersona}`,
    `2. 视角与人称：${params.viewpointNarration}`,
    `3. 语言质感：${params.languageTexture}`,
    `4. 节奏与结构：${params.rhythmStructure}`,
    `5. 情绪温度：${params.emotionTemperature}`,
    `6. 目标与约束：${params.goalsConstraints}`,
  ].join('\n');
}

/** 构造试写用户提示。 */
export function buildTrialWritePrompt(body: StyleTuningTrialWriteRequest): string {
  const outline = body.contentOutline?.trim();
  return [
    `## 发布场景\n${SCENE_LABEL[body.publishScene]}（${body.publishScene}）`,
    `## 软参数\n${formatSoftParams(body.softParams)}`,
    `## 主题内容\n${body.topicContent.trim()}`,
    outline ? `## 内容梗概\n${outline}` : '',
    '',
    '请直接写出试写正文。',
  ]
    .filter((part) => part !== '')
    .join('\n\n');
}
