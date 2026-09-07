import type {
  CreateBusinessAnalysisTaskRequest,
  BusinessAnalysisTaskDetail,
  BusinessAnalysisTaskListItem,
} from '@/app/api/studio/business-analysis/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: BusinessAnalysisTaskListItem,
): Promise<BusinessAnalysisTaskDetail> {
  if (task) {
    return apiPatch<BusinessAnalysisTaskDetail>(`/api/studio/business-analysis/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<BusinessAnalysisTaskDetail>('/api/studio/business-analysis/tasks', {
    name: values.name,
  } satisfies CreateBusinessAnalysisTaskRequest);
}
