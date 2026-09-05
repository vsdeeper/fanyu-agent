import type {
  CreateProductRetouchTaskRequest,
  ProductRetouchTaskDetail,
  ProductRetouchTaskListItem,
} from '@/app/api/product-retouch/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: ProductRetouchTaskListItem,
): Promise<ProductRetouchTaskDetail> {
  if (task) {
    return apiPatch<ProductRetouchTaskDetail>(`/api/product-retouch/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<ProductRetouchTaskDetail>('/api/product-retouch/tasks', {
    name: values.name,
  } satisfies CreateProductRetouchTaskRequest);
}
