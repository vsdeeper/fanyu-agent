import 'server-only';

type JobRegistry = {
  controllers: Map<string, AbortController>;
  shutdownInstalled: boolean;
};

type RegistryGlobal = { __aiAgentStudioJobRegistry?: JobRegistry };

function getRegistry(): JobRegistry {
  const g = globalThis as unknown as RegistryGlobal;
  g.__aiAgentStudioJobRegistry ??= { controllers: new Map(), shutdownInstalled: false };
  return g.__aiAgentStudioJobRegistry;
}

/**
 * 进程退出时中止全部运行中作业。
 *
 * Next.js 收到 SIGINT/SIGTERM 后会等 pending 的 `after()` 回调跑完再退出；不中止的话，
 * 一个长作业会把 Ctrl+C 挂住很久。用 `on` 追加监听而非替换 Next 自己的处理器，两边都会跑。
 */
function installShutdownHook(): void {
  const registry = getRegistry();
  if (registry.shutdownInstalled) return;
  registry.shutdownInstalled = true;

  const onSignal = (signal: NodeJS.Signals) => {
    abortAllJobControllers();
    // 若本进程只有我们这一个监听器，Node 的默认退出行为已被覆盖，需手动补回，否则 Ctrl+C 无效。
    if (process.listenerCount(signal) === 1) {
      process.removeListener(signal, onSignal);
      process.kill(process.pid, signal);
    }
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

/** 登记运行中作业的 controller，供取消与退出时中止。 */
export function registerJobController(jobId: string, controller: AbortController): void {
  installShutdownHook();
  getRegistry().controllers.set(jobId, controller);
}

/** 作业结束（不论成败）后解除登记。 */
export function releaseJobController(jobId: string): void {
  getRegistry().controllers.delete(jobId);
}

/**
 * 该作业是否正由本进程的运行器执行。
 * 应用是单进程的，故「DB 里 running 但本地无登记」即进程重启后遗留的孤儿作业。
 */
export function isJobRegistered(jobId: string): boolean {
  return getRegistry().controllers.has(jobId);
}

/** 中止指定作业；返回 false 表示它不在本进程运行（如服务重启后的残留记录）。 */
export function abortJobController(jobId: string, reason?: unknown): boolean {
  const controller = getRegistry().controllers.get(jobId);
  if (!controller) return false;
  if (!controller.signal.aborted) controller.abort(reason);
  return true;
}

/** 中止本进程全部运行中作业。 */
export function abortAllJobControllers(): void {
  for (const controller of getRegistry().controllers.values()) {
    if (!controller.signal.aborted) controller.abort();
  }
}

/** 当前登记的运行中作业数。 */
export function runningJobCount(): number {
  return getRegistry().controllers.size;
}
