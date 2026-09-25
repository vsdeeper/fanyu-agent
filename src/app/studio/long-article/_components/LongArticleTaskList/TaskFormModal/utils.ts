import type {
  CreateLongArticleTaskRequest,
  LongArticleTaskDetail,
  LongArticleTaskListItem,
} from '@/app/api/studio/long-article/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: LongArticleTaskListItem,
): Promise<LongArticleTaskDetail> {
  if (task) {
    return apiPatch<LongArticleTaskDetail>(`/api/studio/long-article/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<LongArticleTaskDetail>('/api/studio/long-article/tasks', {
    name: values.name,
  } satisfies CreateLongArticleTaskRequest);
}
