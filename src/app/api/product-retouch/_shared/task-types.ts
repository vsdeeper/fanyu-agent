import type { PRODUCT_RETOUCH_STEP_KEYS } from './task-constants';

export type ProductRetouchStepKey = (typeof PRODUCT_RETOUCH_STEP_KEYS)[number];

export type ProductRetouchTaskListItem = {
  id: string;
  name: string;
  workflowVersion: number;
  completedStepKeys: ProductRetouchStepKey[];
  createdAt: string;
  updatedAt: string;
};

export type ProductRetouchTaskListData = {
  items: ProductRetouchTaskListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductRetouchTaskStepRecord = {
  stepKey: ProductRetouchStepKey;
  snapshotVersion: number;
  data: unknown;
  updatedAt: string;
};

export type ProductRetouchTaskDetail = Omit<ProductRetouchTaskListItem, 'completedStepKeys'> & {
  steps: Partial<Record<ProductRetouchStepKey, ProductRetouchTaskStepRecord>>;
};

export type CreateProductRetouchTaskRequest = {
  name: string;
};

export type UpdateProductRetouchTaskRequest = {
  name: string;
};

export type SaveProductRetouchTaskStepRequest = {
  snapshotVersion: number;
  data: unknown;
};
