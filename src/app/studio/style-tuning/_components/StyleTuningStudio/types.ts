import type {
  StyleTuningPublishScene,
  StyleTuningSoftParams,
} from '@/app/api/studio/style-tuning/_shared/types';
import type { StyleDimensionSelections } from '@/business-components/StyleDimensionPicker';

export type StudioPhase =
  'softtune' | 'softtuning' | 'softtuned' | 'trialwrite' | 'trialwriting' | 'trialwritten';

export type SoftTuneStepSnapshot = {
  publishScene: StyleTuningPublishScene;
  topicContent: string;
  styleSelections?: StyleDimensionSelections;
  softParams?: StyleTuningSoftParams;
  streamText?: string;
};

export type TrialWriteStepSnapshot = {
  contentOutline?: string;
  markdown: string;
  streamText?: string;
};

export type SoftParamFieldKey = keyof StyleTuningSoftParams;

export type { StyleDimensionSelections };
