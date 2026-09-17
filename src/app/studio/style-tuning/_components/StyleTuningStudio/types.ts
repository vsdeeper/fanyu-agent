import type {
  StyleTuningPublishScene,
  StyleTuningSoftParams,
} from '@/app/api/studio/style-tuning/_shared/types';

export type StudioPhase =
  'softtune' | 'softtuning' | 'softtuned' | 'trialwrite' | 'trialwriting' | 'trialwritten';

export type SoftTuneStepSnapshot = {
  publishScene: StyleTuningPublishScene;
  topicContent: string;
  stylePrompt: string;
  softParams?: StyleTuningSoftParams;
  streamText?: string;
};

export type TrialWriteStepSnapshot = {
  contentOutline?: string;
  markdown: string;
  streamText?: string;
};

export type SoftParamFieldKey = keyof StyleTuningSoftParams;
