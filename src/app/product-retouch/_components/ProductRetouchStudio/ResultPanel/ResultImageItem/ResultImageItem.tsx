import { Image, Skeleton } from 'antd';
import type { ResultImage } from '../../types';
import styles from './ResultImageItem.module.css';

type ResultImageItemProps = {
  image: ResultImage;
  width: number;
  height: number;
  selectable: boolean;
  selected: boolean;
  selectedBadge?: string;
  onSelect?: (index: number) => void;
};

/** 渲染单张图片的等待、成功、失败与标准图选择状态。 */
export default function ResultImageItem({
  image,
  width,
  height,
  selectable,
  selected,
  selectedBadge,
  onSelect,
}: ResultImageItemProps) {
  return (
    <div className={`${styles.frame} ${selected ? styles.selected : ''}`} style={{ width, height }}>
      {image.status === 'pending' ? (
        <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />
      ) : image.status === 'failed' ? (
        <div className={styles.failed}>{image.error || '图片生成失败'}</div>
      ) : (
        <Image
          src={image.url}
          width={width}
          height={height}
          alt="生成的产品图"
          preview={{ mask: '预览' }}
          className={styles.image}
          placeholder={<Skeleton.Image active style={{ width, height }} />}
        />
      )}
      {selectable && image.status === 'ready' ? (
        <button
          type="button"
          className={selected ? styles.badge : styles.pick}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(image.index);
          }}
        >
          {selected ? selectedBadge : '选为标准'}
        </button>
      ) : null}
    </div>
  );
}
