import { useCallback, useEffect, useState } from 'react';
import { JOB_POLL_INTERVAL_MS } from '@/app/api/studio/_shared/job-constants';
import type { CreateStudioJobRequest, StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import {
  cancelStudioJob,
  createStudioJob,
  requestStudioJobs,
} from '@/app/studio/_utils/job-client';

type UseStudioJobOptions = {
  apiBase: string;
  taskId: string;
  /** 首屏已存在的作业（由 RSC 读库传入），用于重新进入任务时接着看进度 */
  initialJob?: StudioJobSnapshot | null;
};

/**
 * 追踪一个后台生图作业：按固定间隔轮询进度，并提供发起与取消。
 *
 * 卸载时**只停止轮询，绝不取消作业** —— 这正是本特性的意义：离开页面后生成照常在服务端跑完，
 * 下次进入任务时由 `initialJob` 重新接上。岗位后请勿在此处添加取消逻辑。
 */
export function useStudioJob({ apiBase, taskId, initialJob = null }: UseStudioJobOptions) {
  const [job, setJob] = useState<StudioJobSnapshot | null>(initialJob);
  const [cancelling, setCancelling] = useState(false);

  const jobId = job?.id ?? null;
  const running = job?.status === 'running';

  useEffect(() => {
    if (!jobId || !running) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const items = await requestStudioJobs(apiBase, taskId);
        if (disposed) return;
        const next = items.find((item) => item.id === jobId);
        if (next) setJob(next);
      } catch {
        // 轮询失败不改状态：作业在服务端照常推进，下一轮重试即可
      }
      if (!disposed) timer = setTimeout(() => void tick(), JOB_POLL_INTERVAL_MS);
    };

    timer = setTimeout(() => void tick(), JOB_POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [apiBase, taskId, jobId, running]);

  /** 建作业并把追踪目标切到它；服务端幂等，重复调用会拿到同一个运行中作业。 */
  const start = useCallback(
    async (payload: CreateStudioJobRequest): Promise<StudioJobSnapshot | null> => {
      const id = await createStudioJob(apiBase, taskId, payload);
      const items = await requestStudioJobs(apiBase, taskId);
      const snapshot = items.find((item) => item.id === id) ?? null;
      setJob(snapshot);
      return snapshot;
    },
    [apiBase, taskId],
  );

  /** 取消运行中的作业；已出图保留。错误由 api-client 统一 Toast。 */
  const cancel = useCallback(async () => {
    if (!jobId || !running) return;
    setCancelling(true);
    try {
      await cancelStudioJob(apiBase, taskId, jobId);
      // 服务端已同步落 cancelled，此后不会再写入新进度，故本地可直接置终态让界面立刻停
      setJob((current) => (current ? { ...current, status: 'cancelled' } : current));
    } catch (err) {
      console.error('[studio-job] cancel', err);
    } finally {
      setCancelling(false);
    }
  }, [apiBase, taskId, jobId, running]);

  /** 结算完成后解除追踪，避免 effect 反复处理同一个终态作业。 */
  const release = useCallback(() => setJob(null), []);

  return { job, running, cancelling, start, cancel, release };
}
