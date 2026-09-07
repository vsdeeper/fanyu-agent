import { useCallback } from 'react';
import type { DesignResultGroups, StudioResultImage } from '../../types';
import { EXPORT_FAILED } from '../constants';
import { exportResultImages } from '../utils';
import { useExportResultImages as useStudioExportResultImages } from '@/app/studio/_hooks/useExportResultImages';

/** 管理电商设计成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
) {
  const exportArchive = useCallback(
    () => exportResultImages(visualImages, designGroups, analysisText),
    [analysisText, designGroups, visualImages],
  );
  return useStudioExportResultImages(exportArchive, {
    failedMessage: EXPORT_FAILED,
    logTag: 'ecommerce-studio',
  });
}
