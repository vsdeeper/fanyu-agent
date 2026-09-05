import { Image, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import type { StudioResultImage } from '../../../types';
import { getImageSrc } from '../../utils';
import {
  FALLBACK_ICON_SRC,
  RESULT_IMAGE_CLASS_NAMES,
  RESULT_IMAGE_FAILED_CLASS_NAMES,
} from '../constants';
import styles from './ResultImageItem.module.css';

type ResultImageItemProps = {
  image: StudioResultImage;
  /** 预览单元格宽高（随表单尺寸比例换算） */
  width: number;
  height: number;
  selectable?: boolean;
  selected?: boolean;
  selectedBadge?: string;
  onSelect?: (index: number) => void;
};

/**
 * 单张出图：pending Skeleton、就绪预览、失败 fallback；可选点选为视觉标准。
 */
export default function ResultImageItem({
  image,
  width,
  height,
  selectable = false,
  selected = false,
  selectedBadge,
  onSelect,
}: ResultImageItemProps) {
  const canSelect = selectable && image.status === 'ready';

  const frameClass = [
    styles.frame,
    canSelect ? styles.selectable : '',
    selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  let body: ReactNode;
  if (image.status === 'failed') {
    body = (
      <Image
        src={FALLBACK_ICON_SRC}
        width={width}
        height={height}
        alt="图片生成失败"
        preview={false}
        classNames={RESULT_IMAGE_FAILED_CLASS_NAMES}
        fallback={FALLBACK_ICON_SRC}
      />
    );
  } else if (image.status === 'ready') {
    body = (
      <Image
        src={getImageSrc(image)}
        width={width}
        height={height}
        alt="生成的图片"
        preview={{ mask: '预览' }}
        classNames={RESULT_IMAGE_CLASS_NAMES}
        placeholder={<Skeleton.Image active style={{ width, height }} />}
        fallback={FALLBACK_ICON_SRC}
      />
    );
  } else {
    body = <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />;
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
          {selected ? selectedBadge : '选为标准'}
        </button>
      ) : selected && selectedBadge ? (
        <span className={styles.badge}>{selectedBadge}</span>
      ) : null}
    </div>
  );
}
