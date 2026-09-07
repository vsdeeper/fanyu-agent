import { DownloadOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { useCallback } from 'react';
import { PREV_BUTTON, EXPORT_FAILED } from '../constants';
import type { ResultImage } from '../types';
import { exportResultImages, getGeneratedImages } from '../utils';
import CompletionResultGroup from '@/app/studio/_components/CompletionResultGroup';
import { useExportResultImages } from '@/app/studio/_hooks/useExportResultImages';
import { COMPLETION_TITLE, EXPORT_MATERIALS_BUTTON, RESULT_GROUP_TITLE } from './constants';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  results: readonly ResultImage[];
  onPrev: () => void;
};

/** 预览生成物料：按比例二级分类展示成果，并提供全部物料打包导出。 */
export default function CompletionPanel({ results, onPrev }: CompletionPanelProps) {
  const generated = getGeneratedImages(results);
  const hasResults = generated.length > 0;
  const exportArchive = useCallback(() => exportResultImages(results), [results]);
  const { exporting, handleExport } = useExportResultImages(exportArchive, {
    failedMessage: EXPORT_FAILED,
    logTag: 'product-model',
  });
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {hasResults ? (
          <CompletionResultGroup
            title={RESULT_GROUP_TITLE}
            keyPrefix="model"
            images={generated}
            imageAlt="生成的产品模特图"
          />
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
          {EXPORT_MATERIALS_BUTTON}
        </Button>
      </div>
    </section>
  );
}
