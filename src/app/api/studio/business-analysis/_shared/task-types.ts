import type {
  CreateStudioTaskRequest,
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
  UpdateStudioTaskRequest,
} from '@/app/api/studio/_shared/task-types';
import type { BUSINESS_ANALYSIS_STEP_KEYS } from './task-constants';

export type BusinessAnalysisStepKey = (typeof BUSINESS_ANALYSIS_STEP_KEYS)[number];

export type BusinessAnalysisTaskListItem = StudioTaskListItem<BusinessAnalysisStepKey>;

export type BusinessAnalysisTaskListData = StudioTaskListData<BusinessAnalysisTaskListItem>;

export type BusinessAnalysisTaskStepRecord = StudioTaskStepRecord<BusinessAnalysisStepKey>;

export type BusinessAnalysisTaskDetail = StudioTaskDetail<BusinessAnalysisStepKey>;

export type CreateBusinessAnalysisTaskRequest = CreateStudioTaskRequest;

export type UpdateBusinessAnalysisTaskRequest = UpdateStudioTaskRequest;

export type SaveBusinessAnalysisTaskStepRequest = SaveStudioTaskStepRequest;
