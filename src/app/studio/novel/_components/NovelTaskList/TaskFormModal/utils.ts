import type {
  CreateNovelTaskRequest,
  NovelTaskDetail,
  NovelTaskListItem,
} from '@/app/api/studio/novel/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: NovelTaskListItem,
): Promise<NovelTaskDetail> {
  if (task) {
    return apiPatch<NovelTaskDetail>(`/api/studio/novel/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<NovelTaskDetail>('/api/studio/novel/tasks', {
    name: values.name,
  } satisfies CreateNovelTaskRequest);
}
