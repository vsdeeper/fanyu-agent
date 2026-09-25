import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { LONG_ARTICLE_STEP_KEYS } from './task-constants';

export type LongArticleStepKey = (typeof LONG_ARTICLE_STEP_KEYS)[number];

export type LongArticleTaskListItem = StudioTaskListItem<LongArticleStepKey>;

export type LongArticleTaskListData = StudioTaskListData<LongArticleTaskListItem>;

export type LongArticleTaskStepRecord = StudioTaskStepRecord<LongArticleStepKey>;

export type LongArticleTaskDetail = StudioTaskDetail<LongArticleStepKey>;

export type CreateLongArticleTaskRequest = CreateStudioTaskRequest;

export type UpdateLongArticleTaskRequest = UpdateStudioTaskRequest;

export type SaveLongArticleTaskStepRequest = SaveStudioTaskStepRequest;
