import { useCallback, useState } from 'react';
import { App } from 'antd';
import type { DesignResultGroups, StudioResultImage } from '../../types';
import { EXPORT_FAILED } from '../constants';
import { exportResultImages } from '../utils';

/** 管理成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
) {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportResultImages(visualImages, designGroups);
    } catch (error) {
      console.error('[ecommerce-studio] export', error);
      message.error(EXPORT_FAILED);
    } finally {
      setExporting(false);
    }
  }, [designGroups, message, visualImages]);

  return { exporting, handleExport };
}
