import { Typography } from 'antd';
import type { ResultImage } from '../../types';
import { aspectRatioToSize } from '../../utils';
import ResultImageItem from '../../ResultPanel/ResultImageItem';
import styles from './CompletionResultGroup.module.css';

type CompletionResultGroupProps = {
  title: string;
  keyPrefix: string;
  images: readonly ResultImage[];
};

/** 展示单个成果分类下的已生成图片。 */
export default function CompletionResultGroup({
  title,
  keyPrefix,
  images,
}: CompletionResultGroupProps) {
  return (
    <section className={styles.group}>
      <Typography.Title level={5} className={styles.title}>
        {title}
      </Typography.Title>
      <div className={styles.grid}>
        {images.map((image) => {
          const size = aspectRatioToSize(image.aspectRatio, 280);
          return (
            <ResultImageItem
              key={`${keyPrefix}-${image.index}`}
              image={image}
              width={size.width}
              height={size.height}
              selectable={false}
              selected={false}
            />
          );
        })}
      </div>
    </section>
  );
}
