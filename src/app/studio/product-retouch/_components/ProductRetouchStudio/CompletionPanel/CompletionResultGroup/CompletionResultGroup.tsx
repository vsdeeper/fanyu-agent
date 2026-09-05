import { Typography } from 'antd';
import type { ResultImage } from '../../types';
import { aspectRatioToSize, groupResultImagesByRatio } from '../../utils';
import ResultImageItem from '../../ResultPanel/ResultImageItem';
import styles from './CompletionResultGroup.module.css';

type CompletionResultGroupProps = {
  title: string;
  keyPrefix: string;
  images: readonly ResultImage[];
};

/** 展示单个成果分类下按比例组织的已生成图片。 */
export default function CompletionResultGroup({
  title,
  keyPrefix,
  images,
}: CompletionResultGroupProps) {
  const ratioGroups = groupResultImagesByRatio(images);
  return (
    <section className={styles.group}>
      <Typography.Title level={5} className={styles.title}>
        {title}
      </Typography.Title>
      {ratioGroups.map(({ aspectRatio, images: ratioImages }) => (
        <section key={aspectRatio} className={styles.ratioGroup}>
          <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
          <div className={styles.grid}>
            {ratioImages.map((image) => {
              const size = aspectRatioToSize(image.aspectRatio, 280);
              return (
                <ResultImageItem
                  key={`${keyPrefix}-${aspectRatio}-${image.index}`}
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
      ))}
    </section>
  );
}
