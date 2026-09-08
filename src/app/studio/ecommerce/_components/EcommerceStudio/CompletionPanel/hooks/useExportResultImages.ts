import { useCallback } from 'react';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { DesignResultGroups, StudioResultImage } from '../../types';
import { EXPORT_FAILED } from '../constants';
import { exportResultImages, exportSelectedResultImages } from '../utils';
import { useExportResultImages as useStudioExportResultImages } from '@/app/studio/_hooks/useExportResultImages';

/** 管理电商设计成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
  taskType: EcommerceTaskType,
  selectedImages?: readonly StudioResultImage[],
) {
  const exportArchive = useCallback(
    () =>
      selectedImages
        ? exportSelectedResultImages(selectedImages, taskType)
        : exportResultImages(visualImages, designGroups, analysisText, taskType),
    [analysisText, designGroups, selectedImages, taskType, visualImages],
  );
  return useStudioExportResultImages(exportArchive, {
    failedMessage: EXPORT_FAILED,
    logTag: 'ecommerce-studio',
  });
}
