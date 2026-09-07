import { DownloadOutlined, FileTextOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import FileCard from '@/components/FileCard';
import AnalysisPreview from '@/app/studio/_components/AnalysisPreview';
import { useExportResultImages } from '@/app/studio/_hooks/useExportResultImages';
import {
  ANALYSIS_FILE_NAME,
  ANALYSIS_GROUP_TITLE,
  ANALYSIS_MEDIA_TYPE,
  COMPLETION_TITLE,
  EXPORT_FAILED,
  EXPORT_MATERIALS_BUTTON,
  PREV_BUTTON,
} from '../constants';
import { exportAnalysisArchive } from '../utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  analysisText: string;
  onPrev: () => void;
};

/** 预览商业分析物料并导出 Markdown。 */
export default function CompletionPanel({ analysisText, onPrev }: CompletionPanelProps) {
  const [open, setOpen] = useState(false);
  const exportArchive = useCallback(() => exportAnalysisArchive(analysisText), [analysisText]);
  const { exporting, handleExport } = useExportResultImages(exportArchive, {
    failedMessage: EXPORT_FAILED,
    logTag: 'business-analysis',
  });
  const analysisFile = useMemo(() => {
    if (!analysisText.trim()) return undefined;
    return {
      href: URL.createObjectURL(new Blob([analysisText], { type: ANALYSIS_MEDIA_TYPE })),
      byteSize: new TextEncoder().encode(analysisText).length,
    };
  }, [analysisText]);
  useEffect(() => {
    return () => {
      if (analysisFile) URL.revokeObjectURL(analysisFile.href);
    };
  }, [analysisFile]);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {analysisFile ? (
          <div className={styles.groups}>
            <section className={styles.group}>
              <Typography.Title level={5} className={styles.title}>
                {ANALYSIS_GROUP_TITLE}
              </Typography.Title>
              <FileCard
                fileName={ANALYSIS_FILE_NAME}
                byteSize={analysisFile.byteSize}
                href={analysisFile.href}
                icon={<FileTextOutlined />}
                onPreview={() => setOpen(true)}
              />
            </section>
            <AnalysisPreview
              open={open}
              onClose={() => setOpen(false)}
              fileName={ANALYSIS_FILE_NAME}
              analysisText={analysisText}
            />
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分析结果" />
        )}
      </div>
      <div className={styles.footer}>
        <Button size="large" disabled={exporting} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button
          size="large"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          disabled={!analysisFile}
          onClick={handleExport}
        >
          {EXPORT_MATERIALS_BUTTON}
        </Button>
      </div>
    </section>
  );
}
