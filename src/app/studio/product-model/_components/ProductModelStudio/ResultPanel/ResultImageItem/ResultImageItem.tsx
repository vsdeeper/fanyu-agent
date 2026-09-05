import { Image, Skeleton } from 'antd';
import type { ResultImage } from '../../types';
import styles from './ResultImageItem.module.css';

type ResultImageItemProps = {
  image: ResultImage;
  width: number;
  height: number;
};

/** 渲染单张产品模特图的等待、成功或失败状态。 */
export default function ResultImageItem({ image, width, height }: ResultImageItemProps) {
  return (
    <div className={styles.frame} style={{ width, height }}>
      {image.status === 'pending' ? (
        <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />
      ) : image.status === 'failed' ? (
        <div className={styles.failed}>{image.error || '图片生成失败'}</div>
      ) : (
        <Image
          src={image.url}
          width={width}
          height={height}
          alt="生成的产品模特图"
          preview={{ mask: '预览' }}
          className={styles.image}
          placeholder={<Skeleton.Image active style={{ width, height }} />}
        />
      )}
    </div>
  );
}
