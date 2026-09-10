import type { STUDIO_JOB_KINDS, STUDIO_JOB_STATUSES } from './job-constants';
import type { StudioGenerateImageEvent, StudioGenerateRequest } from './generate-types';

export type StudioJobStatus = (typeof STUDIO_JOB_STATUSES)[number];

export type StudioJobKind = (typeof STUDIO_JOB_KINDS)[number];

/**
 * 表单回声：只带回重建与结算所需的生成规格，字段与客户端 `StudioFormState` / `DesignFormState` 对齐。
 */
export type StudioJobFormEcho = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
  /** design 步骤用于分组的任务类型 */
  taskType?: string;
};

/**
 * 占位槽回声，字段与客户端 `StudioResultImage`（`app/studio/_utils/result-images.ts`）一一对应。
 * 两份声明因分层约束无法合并（`_shared` 不得 import `app/studio`），改其一时必须同步另一处，
 * 客户端侧靠 `job-restore` 的逐字段构造在编译期暴露漂移。
 */
export type StudioJobPendingSlot = {
  id: string;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
  themeId?: string;
  themeTitle?: string;
};

/**
 * 建作业时由客户端回显的占位计划。刷新后凭它重建 pending 槽位 ——
 * 若靠 events + 快照反推，主题 themeId / themeTitle 必然错位。
 * 槽位顺序即 `buildGeneratePlan` 的位置序：服务端用 slots[位置] 把出图结果回传给对应槽位。
 */
export type StudioJobPendingPlan = {
  stepKey: string;
  taskType?: string;
  slots: StudioJobPendingSlot[];
  form: StudioJobFormEcho;
};

export type StudioJobData = {
  /** 已完成事件，按到达顺序；`url` 为站内资产 URL 而非 data URL */
  events: StudioGenerateImageEvent[];
  pending: StudioJobPendingPlan;
};

export type StudioJobSnapshot = {
  id: string;
  product: string;
  taskId: string;
  stepKey: string;
  kind: string;
  status: StudioJobStatus;
  data: StudioJobData;
  error?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
};

export type CreateStudioJobRequest = {
  stepKey: string;
  kind: StudioJobKind;
  pending: StudioJobPendingPlan;
  body: StudioGenerateRequest;
};

export type CreateStudioJobData = {
  jobId: string;
};

export type StudioJobListData = {
  items: StudioJobSnapshot[];
};

export type CancelStudioJobData = {
  jobId: string;
  status: StudioJobStatus;
};
