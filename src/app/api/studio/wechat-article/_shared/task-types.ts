import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { WECHAT_ARTICLE_STEP_KEYS } from './task-constants';

export type WechatArticleStepKey = (typeof WECHAT_ARTICLE_STEP_KEYS)[number];

export type WechatArticleTaskListItem = StudioTaskListItem<WechatArticleStepKey>;

export type WechatArticleTaskListData = StudioTaskListData<WechatArticleTaskListItem>;

export type WechatArticleTaskStepRecord = StudioTaskStepRecord<WechatArticleStepKey>;

export type WechatArticleTaskDetail = StudioTaskDetail<WechatArticleStepKey>;

export type CreateWechatArticleTaskRequest = CreateStudioTaskRequest;

export type UpdateWechatArticleTaskRequest = UpdateStudioTaskRequest;

export type SaveWechatArticleTaskStepRequest = SaveStudioTaskStepRequest;
