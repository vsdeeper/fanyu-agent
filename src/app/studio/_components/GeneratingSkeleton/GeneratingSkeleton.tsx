import { Skeleton } from 'antd';
import { aspectRatioToSize } from '@/app/studio/_utils/result-images';
import { SKELETON_BORDER_RADIUS } from './constants';
import styles from './GeneratingSkeleton.module.css';

type GeneratingSkeletonProps = {
  /** 出图比例，如 `3:4`；高度按比例换算。 */
  aspectRatio: string;
  /** 基准宽度（px）。 */
  baseWidth: number;
};

/** 按出图比例占位的生成中骨架，尺寸与同组缩略图一致。 */
export default function GeneratingSkeleton({ aspectRatio, baseWidth }: GeneratingSkeletonProps) {
  const { width, height } = aspectRatioToSize(aspectRatio, baseWidth);
  return (
    <div className={styles.skeleton} style={{ width, height }}>
      <Skeleton.Image active style={{ width, height, borderRadius: SKELETON_BORDER_RADIUS }} />
    </div>
  );
}
