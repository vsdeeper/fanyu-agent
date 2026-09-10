export type StudioTaskListItem<TStepKey extends string, TExtra extends object = object> = {
  id: string;
  name: string;
  workflowVersion: number;
  completedStepKeys: TStepKey[];
  /** 正在后台生成中的步骤键；无运行中作业时省略 */
  runningStepKey?: TStepKey;
  createdAt: string;
  updatedAt: string;
} & TExtra;

export type StudioTaskListData<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type StudioTaskStepRecord<TStepKey extends string> = {
  stepKey: TStepKey;
  snapshotVersion: number;
  data: unknown;
  updatedAt: string;
};

export type StudioTaskDetail<TStepKey extends string, TExtra extends object = object> = Omit<
  StudioTaskListItem<TStepKey, TExtra>,
  'completedStepKeys' | 'runningStepKey'
> & {
  steps: Partial<Record<TStepKey, StudioTaskStepRecord<TStepKey>>>;
};

export type CreateStudioTaskRequest<TExtra extends object = object> = {
  name: string;
} & TExtra;

export type UpdateStudioTaskRequest = {
  name: string;
};

export type SaveStudioTaskStepRequest = {
  snapshotVersion: number;
  data: unknown;
};
