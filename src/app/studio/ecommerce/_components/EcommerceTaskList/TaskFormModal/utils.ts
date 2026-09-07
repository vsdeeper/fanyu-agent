import type {
  CreateEcommerceTaskRequest,
  EcommerceTaskDetail,
  EcommerceTaskListItem,
  EcommerceTaskType,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
  taskType?: EcommerceTaskType;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: EcommerceTaskListItem,
): Promise<EcommerceTaskDetail> {
  if (task) {
    return apiPatch<EcommerceTaskDetail>(`/api/studio/ecommerce/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<EcommerceTaskDetail>('/api/studio/ecommerce/tasks', {
    name: values.name,
    taskType: values.taskType as EcommerceTaskType,
  } satisfies CreateEcommerceTaskRequest);
}
