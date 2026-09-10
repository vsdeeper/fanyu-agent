export const ECOMMERCE_TASK_TYPES = ['主图', '详情图', '营销海报'] as const;

export const ECOMMERCE_WORKFLOW_VERSION = 1;

export const ECOMMERCE_STEP_KEYS = ['analysis', 'visual', 'design'] as const;

/** 可后台化的步骤：分析走 SSE 不入作业，只有两步出图。 */
export const ECOMMERCE_JOB_STEP_KEYS = ['visual', 'design'] as const;

/** 结果图身份改按 id（原先按下标）；仅作形态标记，服务端不比对、读取不做版本分支 */
export const ECOMMERCE_STEP_SNAPSHOT_VERSION = 2;
