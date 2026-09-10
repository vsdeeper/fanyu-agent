import 'server-only';

import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import type { StudioGenerateRequest } from '../_shared/generate-types';
import {
  JOB_CANCEL_SETTLED_MESSAGE,
  JOB_INTERRUPTED_MESSAGE,
  JOB_INVALID_MESSAGE,
  JOB_NOT_FOUND_MESSAGE,
} from '../_shared/job-constants';
import type { StudioJobSnapshot } from '../_shared/job-types';
import { abortJobController, isJobRegistered } from './job-registry';
import { beginStudioJob, runStudioJob, type StudioJobProducer } from './job-runner';
import {
  createJob,
  failJob,
  getJob,
  listJobsByTask,
  requestCancelJob,
  sweepStaleJobs,
} from './job-store';
import { parseCreateJobBody } from './parse-job-request';

/** 由各产品注入：把一次生成请求变成「逐张出图并 emit」的作业生产者。 */
export type StudioJobProducerFactory = (input: {
  taskId: string;
  stepKey: string;
  body: StudioGenerateRequest;
}) => StudioJobProducer;

export type StudioJobHandlersContext = {
  /** 与资产磁盘段一致的产品标识 */
  product: string;
  logTag: string;
  notFoundMessage: string;
  /** 该产品允许入作业的步骤键 */
  stepKeys: readonly string[];
  taskExists: (taskId: string) => boolean;
  producer: StudioJobProducerFactory;
  /**
   * 后台调度。生产传 `(run) => { after(run) }`；测试传同步执行以便断言，
   * 也是 `after()` 万一不可用时唯一的替换点。
   */
  schedule: (run: () => Promise<void>) => void;
};

/**
 * 创建工作室后台作业的 HTTP handler：建作业 / 列表 / 取消。
 * 产品差异全部由 context 注入，本层不依赖任何具体产品实现。
 */
export function createStudioJobHandlers(ctx: StudioJobHandlersContext) {
  /**
   * 先同步登记 controller 再交给调度器（响应返回后才真正开跑）。
   * 登记不能延后到运行器内部：两个请求挨得很近时，后一个会在「已入库未开跑」的窗口里
   * 把前一个误判成重启遗留的孤儿，重复建作业。
   */
  function startJob(job: StudioJobSnapshot, taskId: string, body: StudioGenerateRequest): void {
    const controller = beginStudioJob(job.id);
    ctx.schedule(() =>
      runStudioJob({
        jobId: job.id,
        pending: job.data.pending,
        producer: ctx.producer({ taskId, stepKey: job.stepKey, body }),
        controller,
      }),
    );
  }

  /** 建作业并调度后台执行；同任务同步骤已有运行中作业时幂等返回它。 */
  async function handleCreateJob(taskId: string, req: Request): Promise<Response> {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, JOB_INVALID_MESSAGE, 400);
    }

    const parsed = parseCreateJobBody(json);
    if (!parsed || !ctx.stepKeys.includes(parsed.stepKey)) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, JOB_INVALID_MESSAGE, 400);
    }

    try {
      if (!ctx.taskExists(taskId)) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, ctx.notFoundMessage, 404);
      }

      const input = {
        product: ctx.product,
        taskId,
        stepKey: parsed.stepKey,
        kind: parsed.kind,
        data: { events: [], pending: parsed.pending },
      };

      const first = createJob(input);
      if (first.created) {
        startJob(first.job, taskId, parsed.body);
        return jsonOk({ jobId: first.job.id });
      }
      if (isJobRegistered(first.job.id)) {
        // 真的在跑，交给它原有的运行器即可
        return jsonOk({ jobId: first.job.id });
      }

      // 进程重启后遗留的孤儿 running：其入参已随进程丢失、无法续跑，
      // 就地判失败后重建，否则用户会一直卡到 sweep 超时才拿到新作业。
      failJob(first.job.id, JOB_INTERRUPTED_MESSAGE);
      const second = createJob(input);
      if (second.created) startJob(second.job, taskId, parsed.body);
      return jsonOk({ jobId: second.job.id });
    } catch (error) {
      console.error(`[${ctx.logTag}] create job`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 列出该任务最近的作业，新在前；轮询与刷新恢复共用。 */
  function handleListJobs(taskId: string): Response {
    try {
      if (!ctx.taskExists(taskId)) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, ctx.notFoundMessage, 404);
      }
      sweepStaleJobs();
      return jsonOk({ items: listJobsByTask(taskId) });
    } catch (error) {
      console.error(`[${ctx.logTag}] list jobs`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 取消运行中的作业；已结束的作业返回 409。 */
  function handleCancelJob(taskId: string, jobId: string): Response {
    try {
      const job = getJob(jobId);
      if (!job || job.taskId !== taskId) {
        return jsonFail(ApiErrorCode.JOB_NOT_FOUND, JOB_NOT_FOUND_MESSAGE, 404);
      }
      if (!requestCancelJob(jobId)) {
        return jsonFail(ApiErrorCode.JOB_NOT_CANCELLABLE, JOB_CANCEL_SETTLED_MESSAGE, 409);
      }
      // 终态同步落库后再中止进程内运行器：不等它跑到下一张图，也不给它回写 running 的机会
      abortJobController(jobId);
      return jsonOk({ jobId, status: 'cancelled' });
    } catch (error) {
      console.error(`[${ctx.logTag}] cancel job`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  return { handleCreateJob, handleListJobs, handleCancelJob };
}
