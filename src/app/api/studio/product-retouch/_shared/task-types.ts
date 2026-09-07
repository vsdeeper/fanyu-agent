import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { PRODUCT_RETOUCH_STEP_KEYS } from './task-constants';

export type ProductRetouchStepKey = (typeof PRODUCT_RETOUCH_STEP_KEYS)[number];

export type ProductRetouchTaskListItem = StudioTaskListItem<ProductRetouchStepKey>;

export type ProductRetouchTaskListData = StudioTaskListData<ProductRetouchTaskListItem>;

export type ProductRetouchTaskStepRecord = StudioTaskStepRecord<ProductRetouchStepKey>;

export type ProductRetouchTaskDetail = StudioTaskDetail<ProductRetouchStepKey>;

export type CreateProductRetouchTaskRequest = CreateStudioTaskRequest;

export type UpdateProductRetouchTaskRequest = UpdateStudioTaskRequest;

export type SaveProductRetouchTaskStepRequest = SaveStudioTaskStepRequest;
