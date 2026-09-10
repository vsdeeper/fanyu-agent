import 'server-only';

import { after } from 'next/server';
import type { StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import { createStudioJobHandlers } from '@/app/api/studio/_server/handle-jobs';
import { listJobsByTask, sweepStaleJobs } from '@/app/api/studio/_server/job-store';
import type { EcommerceStepKey, EcommerceTaskDetail } from '../_shared/task-types';
import { ECOMMERCE_JOB_STEP_KEYS } from '../_shared/task-constants';
import { createEcommerceJobProducer } from './job-produce-generate';
import { ecommerceTaskExists, saveTaskAsset } from './task-runtime';

/** 出图作业的资产统一挂在调用它的那一步下，便于随快照一并追溯。 */
function saveGenerateAsset(taskId: string, stepKey: string, dataUrl: string): string {
  return saveTaskAsset(taskId, stepKey, 'generate', dataUrl);
}

const handlers = createStudioJobHandlers({
  product: 'ecommerce',
  logTag: 'ecommerce-jobs',
  notFoundMessage: '电商设计任务不存在',
  stepKeys: ECOMMERCE_JOB_STEP_KEYS,
  taskExists: ecommerceTaskExists,
  producer: createEcommerceJobProducer({
    taskExists: ecommerceTaskExists,
    saveAsset: saveGenerateAsset,
  }),
  // 响应返回后继续在服务端跑；已实测客户端断连不影响其执行
  schedule: (run) => {
    after(run);
  },
});

export const handleCreateEcommerceJob = handlers.handleCreateJob;
export const handleListEcommerceJobs = handlers.handleListJobs;
export const handleCancelEcommerceJob = handlers.handleCancelJob;

/**
 * 选出该任务需要接回的作业，供详情页首屏恢复。
 *
 * 优先运行中的；其次是在用户离开期间已结束、但结果尚未写进步骤快照的作业
 * （客户端是快照的唯一写入者，没人看过就还没落库，需要补一次结算）。
 */
export function selectEcommerceRestorableJob(task: EcommerceTaskDetail): StudioJobSnapshot | null {
  sweepStaleJobs();
  const jobs = listJobsByTask(task.id);
  const running = jobs.find((job) => job.status === 'running');
  if (running) return running;

  const unconsumed = jobs.find((job) => {
    // 没有任何产出的作业接回去也无内容可展示
    if (job.data.events.length === 0) return false;
    const step = task.steps[job.stepKey as EcommerceStepKey];
    return !step || (job.finishedAt ?? job.updatedAt) > step.updatedAt;
  });
  return unconsumed ?? null;
}
