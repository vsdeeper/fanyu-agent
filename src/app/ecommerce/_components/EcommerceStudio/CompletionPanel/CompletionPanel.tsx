import { DownloadOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import { PREV_BUTTON } from '../constants';
import type { DesignResultGroups, StudioResultImage } from '../types';
import DesignResultGroupsView from '../ResultPanel/DesignResultGroups';
import ResultImageGrid from '../ResultPanel/ResultImageGrid';
import { COMPLETION_TITLE, EXPORT_BUTTON, VISUAL_GROUP_TITLE } from './constants';
import { useExportResultImages } from './useExportResultImages';
import { getGeneratedDesignGroups, getGeneratedImages } from './utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  visualImages: readonly StudioResultImage[];
  designResultGroups: DesignResultGroups;
  onPrev: () => void;
};

/** 汇总营销主视觉与各类视觉设计，并提供全部图片打包导出。 */
export default function CompletionPanel({
  visualImages,
  designResultGroups,
  onPrev,
}: CompletionPanelProps) {
  const visualResults = getGeneratedImages(visualImages);
  const designResults = getGeneratedDesignGroups(designResultGroups);
  const hasDesignResults = Object.keys(designResults).length > 0;
  const hasResults = visualResults.length > 0 || hasDesignResults;
  const { exporting, handleExport } = useExportResultImages(visualResults, designResults);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {hasResults ? (
          <div className={styles.groups}>
            {visualResults.length > 0 ? (
              <section className={styles.group}>
                <Typography.Title level={5} className={styles.title}>
                  {VISUAL_GROUP_TITLE}
                </Typography.Title>
                <ResultImageGrid
                  images={visualResults}
                  expectedCount={visualResults.length}
                  aspectRatio={visualResults[0]?.aspectRatio ?? '1:1'}
                />
              </section>
            ) : null}
            {hasDesignResults ? <DesignResultGroupsView groups={designResults} /> : null}
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
