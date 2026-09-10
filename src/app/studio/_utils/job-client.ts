import type {
  CreateStudioJobData,
  CreateStudioJobRequest,
  StudioJobListData,
  StudioJobSnapshot,
} from '@/app/api/studio/_shared/job-types';
import { apiDelete, apiGet, apiPost } from '@/lib/shared/client/api-client';

function jobsUrl(apiBase: string, taskId: string): string {
  return `${apiBase}/tasks/${encodeURIComponent(taskId)}/jobs`;
}

/** 建后台生图作业，返回作业 id；同任务同步骤已有运行中作业时服务端幂等返回它。 */
export async function createStudioJob(
  apiBase: string,
  taskId: string,
  payload: CreateStudioJobRequest,
): Promise<string> {
  const data = await apiPost<CreateStudioJobData>(jobsUrl(apiBase, taskId), payload);
  return data.jobId;
}

/**
 * 拉取该任务最近的作业，新在前。
 * 走 `silent`：轮询期间网络抖动不该每秒弹一次 Toast，失败由下一轮重试兜底。
 */
export async function requestStudioJobs(
  apiBase: string,
  taskId: string,
): Promise<StudioJobSnapshot[]> {
  const data = await apiGet<StudioJobListData>(jobsUrl(apiBase, taskId), { silent: true });
  return data.items;
}

/** 取消运行中的作业；已结束的作业服务端返回 409。 */
export async function cancelStudioJob(
  apiBase: string,
  taskId: string,
  jobId: string,
): Promise<void> {
  await apiDelete<{ jobId: string }>(`${jobsUrl(apiBase, taskId)}/${encodeURIComponent(jobId)}`);
}
