import type { BusinessAnalysisTaskDetail } from '@/app/api/studio/business-analysis/_shared/task-types';
import { BUSINESS_ANALYSIS_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取商业分析任务列表。 */
export async function requestBusinessAnalysisTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/business-analysis', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<BusinessAnalysisTaskDetail, 'id'>): string {
  return `${BUSINESS_ANALYSIS_PATH}/${encodeURIComponent(task.id)}`;
}
