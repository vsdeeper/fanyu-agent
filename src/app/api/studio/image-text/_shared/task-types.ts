import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { IMAGE_TEXT_STEP_KEYS } from './task-constants';

export type ImageTextStepKey = (typeof IMAGE_TEXT_STEP_KEYS)[number];

export type ImageTextTaskListItem = StudioTaskListItem<ImageTextStepKey>;

export type ImageTextTaskListData = StudioTaskListData<ImageTextTaskListItem>;

export type ImageTextTaskStepRecord = StudioTaskStepRecord<ImageTextStepKey>;

export type ImageTextTaskDetail = StudioTaskDetail<ImageTextStepKey>;

export type CreateImageTextTaskRequest = CreateStudioTaskRequest;

export type UpdateImageTextTaskRequest = UpdateStudioTaskRequest;

export type SaveImageTextTaskStepRequest = SaveStudioTaskStepRequest;
