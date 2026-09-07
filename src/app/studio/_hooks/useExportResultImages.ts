import { useCallback, useState } from 'react';
import { App } from 'antd';

const DEFAULT_EXPORT_FAILED = '导出失败，请稍后重试';

/** 管理成果 ZIP 导出的进行中状态与失败提示。 */
export function useExportResultImages(
  exportArchive: () => Promise<void>,
  options?: { failedMessage?: string; logTag?: string },
) {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  const failedMessage = options?.failedMessage ?? DEFAULT_EXPORT_FAILED;
  const logTag = options?.logTag;

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportArchive();
    } catch (error) {
      if (logTag) console.error(`[${logTag}] export`, error);
      message.error(failedMessage);
    } finally {
      setExporting(false);
    }
  }, [exportArchive, failedMessage, logTag, message]);

  return { exporting, handleExport };
}
