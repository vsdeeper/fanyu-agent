import type {
  CreateImageTextTaskRequest,
  ImageTextTaskDetail,
  ImageTextTaskListItem,
} from '@/app/api/studio/image-text/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: ImageTextTaskListItem,
): Promise<ImageTextTaskDetail> {
  if (task) {
    return apiPatch<ImageTextTaskDetail>(`/api/studio/image-text/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<ImageTextTaskDetail>('/api/studio/image-text/tasks', {
    name: values.name,
  } satisfies CreateImageTextTaskRequest);
}
