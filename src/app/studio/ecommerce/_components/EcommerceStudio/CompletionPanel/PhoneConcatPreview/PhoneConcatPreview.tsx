import type { StudioResultImage } from '../../types';
import { getImageSrc } from '../../ResultPanel/utils';
import styles from './PhoneConcatPreview.module.css';

type PhoneConcatPreviewProps = {
  images: readonly StudioResultImage[];
};

/**
 * 详情页完成步右侧：按主题顺序竖向拼接已点选图片，约手机宽度。
 */
export default function PhoneConcatPreview({ images }: PhoneConcatPreviewProps) {
  if (images.length === 0) {
    return <p className={styles.empty}>点选左侧图片预览详情页长图</p>;
  }

  return (
    <div className={styles.phone} aria-label="详情页拼接预览">
      {images.map((image) => {
        const src = getImageSrc(image);
        if (!src) return null;
        return (
          <img
            key={`concat-${image.id}`}
            className={styles.frame}
            src={src}
            alt={image.themeTitle || '详情图'}
          />
        );
      })}
    </div>
  );
}
