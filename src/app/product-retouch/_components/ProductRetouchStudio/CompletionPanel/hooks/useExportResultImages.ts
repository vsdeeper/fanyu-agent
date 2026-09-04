import { useCallback, useState } from 'react';
import { App } from 'antd';
import type { ResultImage } from '../../types';
import { EXPORT_FAILED } from '../constants';
import { exportResultImages } from '../utils';

/** 管理成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
) {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportResultImages(refineImages, multiviewImages);
    } catch (error) {
      console.error('[product-retouch] export', error);
      message.error(EXPORT_FAILED);
    } finally {
      setExporting(false);
    }
  }, [message, multiviewImages, refineImages]);

  return { exporting, handleExport };
}
