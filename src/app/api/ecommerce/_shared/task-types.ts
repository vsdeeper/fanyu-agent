import type { ECOMMERCE_STEP_KEYS, ECOMMERCE_TASK_TYPES } from './task-constants';

export type EcommerceTaskType = (typeof ECOMMERCE_TASK_TYPES)[number];

export type EcommerceStepKey = (typeof ECOMMERCE_STEP_KEYS)[number];

export type EcommerceTaskListItem = {
  id: string;
  name: string;
  taskType: EcommerceTaskType;
  workflowVersion: number;
  completedStepKeys: EcommerceStepKey[];
  createdAt: string;
  updatedAt: string;
};

export type EcommerceTaskListData = {
  items: EcommerceTaskListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EcommerceTaskStepRecord = {
  stepKey: EcommerceStepKey;
  snapshotVersion: number;
  data: unknown;
  updatedAt: string;
};

export type EcommerceTaskDetail = Omit<EcommerceTaskListItem, 'completedStepKeys'> & {
  steps: Partial<Record<EcommerceStepKey, EcommerceTaskStepRecord>>;
};

export type CreateEcommerceTaskRequest = {
  name: string;
  taskType: EcommerceTaskType;
};

export type UpdateEcommerceTaskRequest = {
  name: string;
};

export type SaveEcommerceTaskStepRequest = {
  snapshotVersion: number;
  data: unknown;
};
