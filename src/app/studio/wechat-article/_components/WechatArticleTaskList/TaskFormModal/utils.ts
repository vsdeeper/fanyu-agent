import type {
  CreateWechatArticleTaskRequest,
  WechatArticleTaskDetail,
  WechatArticleTaskListItem,
} from '@/app/api/studio/wechat-article/_shared/task-types';
import { apiPatch, apiPost } from '@/lib/shared/client/api-client';

export type TaskFormValues = {
  name: string;
};

/** 新建任务或仅更新已有任务名称。 */
export async function submitTaskForm(
  values: TaskFormValues,
  task?: WechatArticleTaskListItem,
): Promise<WechatArticleTaskDetail> {
  if (task) {
    return apiPatch<WechatArticleTaskDetail>(`/api/studio/wechat-article/tasks/${task.id}`, {
      name: values.name,
    });
  }
  return apiPost<WechatArticleTaskDetail>('/api/studio/wechat-article/tasks', {
    name: values.name,
  } satisfies CreateWechatArticleTaskRequest);
}
