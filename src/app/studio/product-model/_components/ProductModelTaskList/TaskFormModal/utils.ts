import type {
  CreateProductModelTaskRequest,
  ProductModelTaskDetail,
  ProductModelTaskListItem,
} from '@/app/api/studio/product-model/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: ProductModelTaskListItem,
): Promise<ProductModelTaskDetail> {
  if (task) {
    return apiPatch<ProductModelTaskDetail>(`/api/studio/product-model/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<ProductModelTaskDetail>('/api/studio/product-model/tasks', {
    name: values.name,
  } satisfies CreateProductModelTaskRequest);
}
