import type { PRODUCT_MODEL_STEP_KEYS } from './task-constants';

export type ProductModelStepKey = (typeof PRODUCT_MODEL_STEP_KEYS)[number];

export type ProductModelTaskListItem = {
  id: string;
  name: string;
  workflowVersion: number;
  completedStepKeys: ProductModelStepKey[];
  createdAt: string;
  updatedAt: string;
};

export type ProductModelTaskListData = {
  items: ProductModelTaskListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductModelTaskStepRecord = {
  stepKey: ProductModelStepKey;
  snapshotVersion: number;
  data: unknown;
  updatedAt: string;
};

export type ProductModelTaskDetail = Omit<ProductModelTaskListItem, 'completedStepKeys'> & {
  steps: Partial<Record<ProductModelStepKey, ProductModelTaskStepRecord>>;
};

export type CreateProductModelTaskRequest = {
  name: string;
};

export type UpdateProductModelTaskRequest = {
  name: string;
};

export type SaveProductModelTaskStepRequest = {
  snapshotVersion: number;
  data: unknown;
};
