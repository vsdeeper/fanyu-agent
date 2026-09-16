import type { WechatArticleTaskDetail } from '@/app/api/studio/wechat-article/_shared/task-types';
import { WECHAT_ARTICLE_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取公众号任务列表。 */
export async function requestWechatArticleTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/wechat-article', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<WechatArticleTaskDetail, 'id'>): string {
  return `${WECHAT_ARTICLE_PATH}/${encodeURIComponent(task.id)}`;
}
