import { StarOutlined } from '@ant-design/icons';
import { Button, Skeleton, Typography } from 'antd';
import { COMPLETE_BUTTON, EMPTY_RESULT_HINT } from '../constants';
import type { ResultImage } from '../types';
import { aspectRatioToSize, groupResultImagesByRatio, hasReadyImage } from '../utils';
import ResultImageItem from './ResultImageItem';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  images: readonly ResultImage[];
  expectedCount: number;
  aspectRatio: string;
  generating: boolean;
  persisting: boolean;
  onComplete: () => void;
};

/** 产品模特工作台右栏：按比例二级分类展示生成结果，右下角提供「完成」落盘。 */
export default function ResultPanel({
  images,
  expectedCount,
  aspectRatio,
  generating,
  persisting,
  onComplete,
}: ResultPanelProps) {
  const placeholderSize = aspectRatioToSize(aspectRatio, 280);
  const ratioGroups = groupResultImagesByRatio(images);
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        产品模特
      </div>
      {images.length > 0 ? (
        <div className={styles.scroll}>
          {ratioGroups.map(({ aspectRatio: ratio, images: ratioImages }) => (
            <section key={ratio} className={styles.ratioGroup}>
              <Typography.Text className={styles.ratioTitle}>{ratio}</Typography.Text>
              <div className={styles.grid}>
                {ratioImages.map((image) => {
                  const size = aspectRatioToSize(image.aspectRatio, 280);
                  return (
                    <ResultImageItem
                      key={`${ratio}-${image.index}`}
                      image={image}
                      width={size.width}
                      height={size.height}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : generating ? (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {Array.from({ length: Math.max(1, expectedCount) }, (_, index) => (
              <Skeleton.Image
                key={index}
                active
                style={{
                  width: placeholderSize.width,
                  height: placeholderSize.height,
                  borderRadius: 8,
                }}
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
          loading={persisting}
          disabled={generating || persisting || !hasReadyImage(images)}
          onClick={onComplete}
        >
          {COMPLETE_BUTTON}
        </Button>
      </div>
    </section>
  );
}
