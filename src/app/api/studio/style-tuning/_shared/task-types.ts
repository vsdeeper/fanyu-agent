import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { STYLE_TUNING_STEP_KEYS } from './task-constants';

export type StyleTuningStepKey = (typeof STYLE_TUNING_STEP_KEYS)[number];

export type StyleTuningTaskListItem = StudioTaskListItem<StyleTuningStepKey>;

export type StyleTuningTaskListData = StudioTaskListData<StyleTuningTaskListItem>;

export type StyleTuningTaskStepRecord = StudioTaskStepRecord<StyleTuningStepKey>;

export type StyleTuningTaskDetail = StudioTaskDetail<StyleTuningStepKey>;

export type CreateStyleTuningTaskRequest = CreateStudioTaskRequest;

export type UpdateStyleTuningTaskRequest = UpdateStudioTaskRequest;

export type SaveStyleTuningTaskStepRequest = SaveStudioTaskStepRequest;
