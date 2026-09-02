import { Image, Skeleton } from 'antd';
import type { StudioResultImage } from '../../types';
import ResultImageItem from './ResultImageItem';
import { RESULT_IMAGE_SIZE, RESULT_PREVIEW_GROUP_CLASS_NAMES } from './constants';
import { getImageSrc } from '../utils';
import styles from './ResultImageGrid.module.css';

type ResultImageGridProps = {
  images: readonly StudioResultImage[];
  expectedCount: number;
};

/**
 * 工作台出图网格：pending 为 Skeleton，就绪为可预览图，失败为 fallback。
 */
export default function ResultImageGrid({ images, expectedCount }: ResultImageGridProps) {
  const previewItems = images
    .filter((item) => item.status === 'ready')
    .map((item) => ({ src: getImageSrc(item) }))
    .filter((item) => item.src);

  if (images.length === 0) {
    const placeholders = Math.max(1, expectedCount);
    return (
      <div className={styles.grid}>
        {Array.from({ length: placeholders }, (_, index) => (
          <Skeleton.Image
            key={`pending-${index}`}
            active
            style={{ width: RESULT_IMAGE_SIZE, height: RESULT_IMAGE_SIZE, borderRadius: 8 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      <Image.PreviewGroup items={previewItems} classNames={RESULT_PREVIEW_GROUP_CLASS_NAMES}>
        {images.map((item) => (
          <ResultImageItem key={`result-${item.index}`} image={item} />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
