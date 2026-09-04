import { DownloadOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { PREV_BUTTON } from '../constants';
import type { ResultImage } from '../types';
import CompletionResultGroup from './CompletionResultGroup';
import {
  COMPLETION_TITLE,
  EXPORT_BUTTON,
  MULTIVIEW_GROUP_TITLE,
  REFINE_GROUP_TITLE,
} from './constants';
import { useExportResultImages } from './useExportResultImages';
import { getGeneratedImages } from './utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  refineImages: readonly ResultImage[];
  multiviewImages: readonly ResultImage[];
  onPrev: () => void;
};

/** 分类展示前两步成果，并提供全部图片打包导出。 */
export default function CompletionPanel({
  refineImages,
  multiviewImages,
  onPrev,
}: CompletionPanelProps) {
  const refineResults = getGeneratedImages(refineImages);
  const multiviewResults = getGeneratedImages(multiviewImages);
  const hasResults = refineResults.length > 0 || multiviewResults.length > 0;
  const { exporting, handleExport } = useExportResultImages(refineResults, multiviewResults);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {hasResults ? (
          <div className={styles.groups}>
            {refineResults.length > 0 ? (
              <CompletionResultGroup
                title={REFINE_GROUP_TITLE}
                keyPrefix="refine"
                images={refineResults}
              />
            ) : null}
            {multiviewResults.length > 0 ? (
              <CompletionResultGroup
                title={MULTIVIEW_GROUP_TITLE}
                keyPrefix="multiview"
                images={multiviewResults}
              />
            ) : null}
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
