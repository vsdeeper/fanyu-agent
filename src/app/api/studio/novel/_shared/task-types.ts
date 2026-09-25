import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { NOVEL_STEP_KEYS } from './task-constants';

export type NovelStepKey = (typeof NOVEL_STEP_KEYS)[number];

export type NovelTaskListItem = StudioTaskListItem<NovelStepKey>;

export type NovelTaskListData = StudioTaskListData<NovelTaskListItem>;

export type NovelTaskStepRecord = StudioTaskStepRecord<NovelStepKey>;

export type NovelTaskDetail = StudioTaskDetail<NovelStepKey>;

export type CreateNovelTaskRequest = CreateStudioTaskRequest;

export type UpdateNovelTaskRequest = UpdateStudioTaskRequest;

export type SaveNovelTaskStepRequest = SaveStudioTaskStepRequest;
