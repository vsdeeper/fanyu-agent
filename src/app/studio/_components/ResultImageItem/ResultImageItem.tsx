import type { ReactNode } from 'react';
import { Image, Skeleton } from 'antd';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import styles from './ResultImageItem.module.css';

type ResultImageItemProps = {
  image: StudioResultImage;
  width: number;
  height: number;
  alt?: string;
  selectable?: boolean;
  selected?: boolean;
  selectedBadge?: string;
  pickLabel?: string;
  onSelect?: (index: number) => void;
  getSrc?: (image: StudioResultImage) => string;
  failedFallbackSrc?: string;
  imageClassNames?: object;
  failedClassNames?: object;
};

/** 渲染单张图片的等待、成功、失败与「选为标准」状态。 */
export default function ResultImageItem({
  image,
  width,
  height,
  alt = '生成的图片',
  selectable = false,
  selected = false,
  selectedBadge,
  pickLabel = '选为标准',
  onSelect,
  getSrc,
  failedFallbackSrc,
  imageClassNames,
  failedClassNames,
}: ResultImageItemProps) {
  const canSelect = selectable && image.status === 'ready';
  const src = getSrc?.(image) ?? image.url;

  const frameClass = [
    styles.frame,
    canSelect ? styles.selectable : '',
    selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  let body: ReactNode;
  if (image.status === 'pending') {
    body = <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />;
  } else if (image.status === 'failed') {
    body = failedFallbackSrc ? (
      <Image
        src={failedFallbackSrc}
        width={width}
        height={height}
        alt="图片生成失败"
        preview={false}
        classNames={failedClassNames}
        fallback={failedFallbackSrc}
      />
    ) : (
      <div className={styles.failed}>{image.error || '图片生成失败'}</div>
    );
  } else {
    body = (
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        preview={{ mask: '预览' }}
        className={styles.image}
        classNames={imageClassNames}
        placeholder={<Skeleton.Image active style={{ width, height }} />}
        fallback={failedFallbackSrc}
      />
    );
  }

  return (
    <div className={frameClass} style={{ width, height }}>
      {body}
      {canSelect ? (
        <button
          type="button"
          className={selected ? `${styles.badge} ${styles.badgeButton}` : styles.pick}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(image.index);
          }}
        >
          {selected ? selectedBadge : pickLabel}
        </button>
      ) : selected && selectedBadge ? (
        <span className={styles.badge}>{selectedBadge}</span>
      ) : null}
    </div>
  );
}
