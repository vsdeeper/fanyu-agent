import type { STYLE_TUNING_PUBLISH_SCENES } from './constants';

export type StyleTuningPublishScene = (typeof STYLE_TUNING_PUBLISH_SCENES)[number];

/** 六维软调参数。 */
export type StyleTuningSoftParams = {
  rolePersona: string;
  viewpointNarration: string;
  languageTexture: string;
  rhythmStructure: string;
  emotionTemperature: string;
  goalsConstraints: string;
};

/** 软调请求。 */
export type StyleTuningSoftTuneRequest = {
  publishScene: StyleTuningPublishScene;
  topicContent: string;
  stylePrompt: string;
};

/** 试写请求。 */
export type StyleTuningTrialWriteRequest = {
  publishScene: StyleTuningPublishScene;
  softParams: StyleTuningSoftParams;
  topicContent: string;
  contentOutline?: string;
};

export type StyleTuningSseTextEvent = {
  delta: string;
};
