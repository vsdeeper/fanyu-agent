import { useCallback } from 'react';
import type { ResultImage } from '../../types';
import { EXPORT_FAILED } from '../constants';
import { exportResultImages } from '../utils';
import { useExportResultImages as useStudioExportResultImages } from '@/app/studio/_hooks/useExportResultImages';

/** 管理产品精修成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
) {
  const exportArchive = useCallback(
    () => exportResultImages(refineImages, multiviewImages),
    [multiviewImages, refineImages],
  );
  return useStudioExportResultImages(exportArchive, {
    failedMessage: EXPORT_FAILED,
    logTag: 'product-retouch',
  });
}
