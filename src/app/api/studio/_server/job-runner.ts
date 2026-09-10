import 'server-only';

import type { StudioGenerateImageEvent } from '../_shared/generate-types';
import type { StudioJobData, StudioJobPendingPlan } from '../_shared/job-types';
import {
  JOB_DEADLINE_EXCEEDED_MESSAGE,
  JOB_DEADLINE_MS,
  JOB_GENERATE_FAILED_MESSAGE,
} from '../_shared/job-constants';
import { failJob, finishJob, updateJobData } from './job-store';
import { registerJobController, releaseJobController } from './job-registry';

/** 作业超出总预算时作为中止原因传入，据此区分「超时」与「用户取消」。 */
export class JobDeadlineExceededError extends Error {
  constructor() {
    super(JOB_DEADLINE_EXCEEDED_MESSAGE);
    this.name = 'JobDeadlineExceededError';
  }
}

/**
 * 生产者主动中止作业并指定**可直接展示给用户**的原因（如任务已被删除）。
 * 其余异常一律落到通用文案，避免把上游报错原文透到客户端。
 */
export class StudioJobFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudioJobFailureError';
  }
}

/** 落一条已完成的出图事件。生产者只管产出，落盘交给运行器。 */
export type StudioJobEmit = (event: StudioGenerateImageEvent) => void;

export type StudioJobProducerContext = {
  /** 作业自身的信号：合并了「用户取消」与「总预算超时」。**不是** req.signal。 */
  signal: AbortSignal;
  emit: StudioJobEmit;
};

export type StudioJobProducer = (ctx: StudioJobProducerContext) => Promise<void>;

export type JobRunnerDeps = {
  updateData: (jobId: string, data: StudioJobData) => boolean;
  finish: (jobId: string, data: StudioJobData) => boolean;
  fail: (jobId: string, error: string, data?: StudioJobData) => boolean;
  release: (jobId: string) => void;
};

const defaultDeps: JobRunnerDeps = {
  updateData: updateJobData,
  finish: finishJob,
  fail: failJob,
  release: releaseJobController,
};

export type RunStudioJobInput = {
  jobId: string;
  pending: StudioJobPendingPlan;
  producer: StudioJobProducer;
  /** 由 `beginStudioJob` 建好并登记；运行器不再自行创建 */
  controller: AbortController;
  deadlineMs?: number;
};

/**
 * 建作业的 controller 并**同步登记**。必须在交给调度器之前调用：
 * 否则在「作业已入库但运行器尚未启动」的窗口里，重复提交会被误判为进程重启遗留的孤儿，
 * 从而重复建出第二个作业。
 */
export function beginStudioJob(jobId: string): AbortController {
  const controller = new AbortController();
  registerJobController(jobId, controller);
  return controller;
}

/**
 * 跑一个生图作业：生产者逐张出图并 emit，运行器负责落进度与终态。
 *
 * 用作业自己的 controller 而**不复用 req.signal**：透传的话用户一切走页面就会中止上游出图，
 * 本特性的意义（离开页面仍在后台跑完）随即失效。单图超时由 provider 内部的
 * `createRequestAbortSignal` 施加，此处不再叠加。
 */
export async function runStudioJob(
  input: RunStudioJobInput,
  deps: JobRunnerDeps = defaultDeps,
): Promise<void> {
  const { jobId, controller } = input;

  const timer = setTimeout(
    () => controller.abort(new JobDeadlineExceededError()),
    input.deadlineMs ?? JOB_DEADLINE_MS,
  );
  // 挂起的总预算定时器不该独自吊住进程
  timer.unref?.();

  const events: StudioGenerateImageEvent[] = [];
  const snapshot = (): StudioJobData => ({ events: [...events], pending: input.pending });
  const timedOut = () => controller.signal.reason instanceof JobDeadlineExceededError;

  try {
    await input.producer({
      signal: controller.signal,
      emit: (event) => {
        events.push(event);
        // 写入失败即作业已非 running（被取消或判中断），就地中止让生产者尽早收手
        if (!deps.updateData(jobId, snapshot())) controller.abort();
      },
    });

    if (controller.signal.aborted) {
      // 取消的终态已由取消接口写入；超时的终态在这里补，并保留已完成的部分结果
      if (timedOut()) deps.fail(jobId, JOB_DEADLINE_EXCEEDED_MESSAGE, snapshot());
      return;
    }
    deps.finish(jobId, snapshot());
  } catch (err) {
    if (controller.signal.aborted) {
      if (timedOut()) deps.fail(jobId, JOB_DEADLINE_EXCEEDED_MESSAGE, snapshot());
      return;
    }
    console.error('[studio/job] runner', jobId, err);
    const message =
      err instanceof StudioJobFailureError ? err.message : JOB_GENERATE_FAILED_MESSAGE;
    deps.fail(jobId, message, snapshot());
  } finally {
    clearTimeout(timer);
    deps.release(jobId);
  }
}
