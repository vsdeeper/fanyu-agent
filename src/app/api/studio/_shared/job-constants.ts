/**
 * 工作室后台生图作业的共享常量（Client 与 Server 共用，勿放 Node 专属内容）。
 */

export const STUDIO_JOB_STATUSES = ['running', 'succeeded', 'failed', 'cancelled'] as const;

/** 作业类型；目前只有生图，分析仍走原有 SSE 不入作业 */
export const STUDIO_JOB_KINDS = ['generate'] as const;

/**
 * 作业总预算兜底。自托管 `next start` 下 route `maxDuration` 不施加任何超时，
 * 若无此上限，异常作业会一直占着 running 行；这是防失控阈值，不是预期耗时。
 */
export const JOB_DEADLINE_MS = 60 * 60 * 1000;

/**
 * 僵尸作业判定阈值：running 且超过此时长未写入即视为进程已死。
 * 必须大于单图出站超时 IMAGE_REQUEST_TIMEOUT_MS（540s），否则正常出图途中会被误判。
 */
export const JOB_STALE_MS = 15 * 60 * 1000;

/** 单任务保留的作业行上限，超出按创建时间删除最旧的 */
export const JOB_HISTORY_LIMIT = 20;

/** 轮询间隔：出图事件数十秒才变一次，1s 足够 */
export const JOB_POLL_INTERVAL_MS = 1000;

/** 列表页存在运行中作业时的自动刷新间隔 */
export const TASK_LIST_RUNNING_REFRESH_MS = 5000;

export const JOB_NOT_FOUND_MESSAGE = '生成作业不存在';
export const JOB_CANCEL_SETTLED_MESSAGE = '作业已结束，无法取消';
export const JOB_INVALID_MESSAGE = '生成作业参数无效';
export const JOB_INTERRUPTED_MESSAGE = '服务重启导致生成中断';
export const JOB_DEADLINE_EXCEEDED_MESSAGE = '生成超出时间预算已停止';
export const JOB_TASK_MISSING_MESSAGE = '任务已删除，生成停止';
export const JOB_GENERATE_FAILED_MESSAGE = '生成失败，请稍后重试';
