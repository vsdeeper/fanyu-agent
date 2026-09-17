import type {
  CreateStyleTuningTaskRequest,
  StyleTuningTaskDetail,
  StyleTuningTaskListItem,
} from '@/app/api/studio/style-tuning/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: StyleTuningTaskListItem,
): Promise<StyleTuningTaskDetail> {
  if (task) {
    return apiPatch<StyleTuningTaskDetail>(`/api/studio/style-tuning/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<StyleTuningTaskDetail>('/api/studio/style-tuning/tasks', {
    name: values.name,
  } satisfies CreateStyleTuningTaskRequest);
}
