import { DownloadOutlined, StarOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { EMPTY_RESULT_HINT, EXPORT_BUTTON } from '../constants';
import type { ResultImage } from '../types';
import { aspectRatioToSize } from '../utils';
import ResultImageItem from './ResultImageItem';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  images: readonly ResultImage[];
  expectedCount: number;
  aspectRatio: string;
  generating: boolean;
  exporting: boolean;
  readyCount: number;
  onExport: () => void;
};

/** 产品模特工作台右栏：展示生成结果并在右下角提供全部导出。 */
export default function ResultPanel({
  images,
  expectedCount,
  aspectRatio,
  generating,
  exporting,
  readyCount,
  onExport,
}: ResultPanelProps) {
  const placeholderSize = aspectRatioToSize(aspectRatio, 280);
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        产品模特
      </div>
      {images.length > 0 ? (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {images.map((image) => {
              const size = aspectRatioToSize(image.aspectRatio, 280);
              return (
                <ResultImageItem
                  key={image.index}
                  image={image}
                  width={size.width}
                  height={size.height}
                />
              );
            })}
          </div>
        </div>
      ) : generating ? (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {Array.from({ length: Math.max(1, expectedCount) }, (_, index) => (
              <div
                key={index}
                className={styles.placeholder}
                style={{ width: placeholderSize.width, height: placeholderSize.height }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <StarOutlined className={styles.emptyIcon} />
          <p>{EMPTY_RESULT_HINT}</p>
        </div>
      )}
      <div className={styles.footer}>
        <Button
          size="large"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          disabled={generating || readyCount === 0}
          onClick={onExport}
        >
          {EXPORT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
