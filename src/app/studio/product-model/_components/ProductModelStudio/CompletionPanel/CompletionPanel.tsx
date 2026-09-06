import { DownloadOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { PREV_BUTTON } from '../constants';
import type { ResultImage } from '../types';
import { getGeneratedImages } from '../utils';
import CompletionResultGroup from './CompletionResultGroup';
import { COMPLETION_TITLE, EXPORT_MATERIALS_BUTTON, RESULT_GROUP_TITLE } from './constants';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  results: readonly ResultImage[];
  exporting: boolean;
  onPrev: () => void;
  onExport: () => void;
};

/** 预览生成物料：按比例二级分类展示成果，并提供全部物料打包导出。 */
export default function CompletionPanel({
  results,
  exporting,
  onPrev,
  onExport,
}: CompletionPanelProps) {
  const generated = getGeneratedImages(results);
  const hasResults = generated.length > 0;
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
      </div>
      <div className={styles.scroll}>
        {hasResults ? (
          <CompletionResultGroup title={RESULT_GROUP_TITLE} keyPrefix="model" images={generated} />
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
          onClick={onExport}
        >
          {EXPORT_MATERIALS_BUTTON}
        </Button>
      </div>
    </section>
  );
}
