import { Image, Skeleton } from 'antd';
import type { StudioResultImage } from '../../types';
import ResultImageItem from './ResultImageItem';
import { RESULT_IMAGE_SIZE, RESULT_PREVIEW_GROUP_CLASS_NAMES } from './constants';
import { aspectRatioToSize, getImageSrc } from '../utils';
import styles from './ResultImageGrid.module.css';

type ResultImageGridProps = {
  images: readonly StudioResultImage[];
  expectedCount: number;
  /** 表单「尺寸比例」（如 3:4），用于对齐预览/骨架显示比例 */
  aspectRatio: string;
  selectable?: boolean;
  selectedIndex?: number | null;
  selectedBadge?: string;
  onSelect?: (index: number) => void;
};

/**
 * 工作台出图网格：pending 为 Skeleton，就绪为可预览图，失败为 fallback。
 * 预览与骨架单元格比例随表单「尺寸比例」变化；主视觉步可点选一张为标准。
 */
export default function ResultImageGrid({
  images,
  expectedCount,
  aspectRatio,
  selectable = false,
  selectedIndex = null,
  selectedBadge,
  onSelect,
}: ResultImageGridProps) {
  const { width: placeholderWidth, height: placeholderHeight } = aspectRatioToSize(
    aspectRatio,
    RESULT_IMAGE_SIZE,
  );
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
            style={{ width: placeholderWidth, height: placeholderHeight, borderRadius: 8 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      <Image.PreviewGroup items={previewItems} classNames={RESULT_PREVIEW_GROUP_CLASS_NAMES}>
        {images.map((item) => {
          const { width, height } = aspectRatioToSize(item.aspectRatio, RESULT_IMAGE_SIZE);
          return (
            <ResultImageItem
              key={`result-${item.index}`}
              image={item}
              width={width}
              height={height}
              selectable={selectable}
              selected={selectedIndex === item.index}
              selectedBadge={selectedBadge}
              onSelect={onSelect}
            />
          );
        })}
      </Image.PreviewGroup>
    </div>
  );
}
