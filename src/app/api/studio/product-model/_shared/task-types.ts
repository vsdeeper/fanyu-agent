import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { PRODUCT_MODEL_STEP_KEYS } from './task-constants';

export type ProductModelStepKey = (typeof PRODUCT_MODEL_STEP_KEYS)[number];

export type ProductModelTaskListItem = StudioTaskListItem<ProductModelStepKey>;

export type ProductModelTaskListData = StudioTaskListData<ProductModelTaskListItem>;

export type ProductModelTaskStepRecord = StudioTaskStepRecord<ProductModelStepKey>;

export type ProductModelTaskDetail = StudioTaskDetail<ProductModelStepKey>;

export type CreateProductModelTaskRequest = CreateStudioTaskRequest;

export type UpdateProductModelTaskRequest = UpdateStudioTaskRequest;

export type SaveProductModelTaskStepRequest = SaveStudioTaskStepRequest;
