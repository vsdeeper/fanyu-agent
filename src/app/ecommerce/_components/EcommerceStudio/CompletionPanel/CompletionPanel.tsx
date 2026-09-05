import { DownloadOutlined, FileTextOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import FileCard from '@/components/FileCard';
import AnalysisPreview from './AnalysisPreview';
import { PREV_BUTTON } from '../constants';
import type { DesignResultGroups, StudioResultImage } from '../types';
import DesignResultGroupsView from '../ResultPanel/DesignResultGroups';
import ResultImageGrid from '../ResultPanel/ResultImageGrid';
import { groupResultImagesByRatio } from '../ResultPanel/utils';
import {
  ANALYSIS_FILE_NAME,
  ANALYSIS_GROUP_TITLE,
  ANALYSIS_MEDIA_TYPE,
  COMPLETION_TITLE,
  EXPORT_BUTTON,
  VISUAL_GROUP_TITLE,
} from './constants';
import { useExportResultImages } from './hooks/useExportResultImages';
import { getGeneratedDesignGroups, getGeneratedImages } from './utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  analysisText: string;
  visualImages: readonly StudioResultImage[];
  designResultGroups: DesignResultGroups;
  onPrev: () => void;
};

/** 汇总商业分析、营销主视觉与各类视觉设计，并提供全部图片打包导出。 */
export default function CompletionPanel({
  analysisText,
  visualImages,
  designResultGroups,
  onPrev,
}: CompletionPanelProps) {
  const visualResults = getGeneratedImages(visualImages);
  const designResults = getGeneratedDesignGroups(designResultGroups);
  const hasDesignResults = Object.keys(designResults).length > 0;
  const hasResults = visualResults.length > 0 || hasDesignResults;
  const [open, setOpen] = useState(false);
  const { exporting, handleExport } = useExportResultImages(
    visualResults,
    designResults,
    analysisText,
  );
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
  const visualGroups = groupResultImagesByRatio(visualResults);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {hasResults || analysisFile ? (
          <div className={styles.groups}>
            {analysisFile ? (
              <>
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
              </>
            ) : null}
            {visualResults.length > 0 ? (
              <section className={styles.group}>
                <Typography.Title level={5} className={styles.title}>
                  {VISUAL_GROUP_TITLE}
                </Typography.Title>
                {visualGroups.map(({ aspectRatio, images }) => (
                  <section key={aspectRatio} className={styles.ratioGroup}>
                    <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
                    <ResultImageGrid
                      images={images}
                      expectedCount={images.length}
                      aspectRatio={aspectRatio}
                    />
                  </section>
                ))}
              </section>
            ) : null}
            {hasDesignResults ? <DesignResultGroupsView groups={designResults} showTitles /> : null}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无生成图片" />
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
          disabled={!hasResults}
          onClick={handleExport}
        >
          {EXPORT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
