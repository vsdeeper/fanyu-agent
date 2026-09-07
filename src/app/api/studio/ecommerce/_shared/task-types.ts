import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { ECOMMERCE_STEP_KEYS, ECOMMERCE_TASK_TYPES } from './task-constants';

export type EcommerceTaskType = (typeof ECOMMERCE_TASK_TYPES)[number];

export type EcommerceStepKey = (typeof ECOMMERCE_STEP_KEYS)[number];

export type EcommerceTaskListItem = StudioTaskListItem<
  EcommerceStepKey,
  { taskType: EcommerceTaskType }
>;

export type EcommerceTaskListData = StudioTaskListData<EcommerceTaskListItem>;

export type EcommerceTaskStepRecord = StudioTaskStepRecord<EcommerceStepKey>;

export type EcommerceTaskDetail = StudioTaskDetail<
  EcommerceStepKey,
  { taskType: EcommerceTaskType }
>;

export type CreateEcommerceTaskRequest = CreateStudioTaskRequest<{ taskType: EcommerceTaskType }>;

export type UpdateEcommerceTaskRequest = UpdateStudioTaskRequest;

export type SaveEcommerceTaskStepRequest = SaveStudioTaskStepRequest;
