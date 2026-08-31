import ChatImage from '../../../ChatImage';
import type { GenerateImageInGroup } from '../utils';
import styles from './OverlapStack.module.css';

/**
 * 同类型多图如书页叠放：后图右移叠在前图之上。preview=false 时用于详情图簇（整块点击打开侧栏），
 * 避免图片自带预览拦截簇的点击；preview 时用于主图/营销图簇（走组内 antd 轮播）。
 */
export default function OverlapStack({
  items,
  preview,
}: {
  items: GenerateImageInGroup[];
  preview: boolean;
}) {
  return (
    <div className={styles.overlapStack}>
      {items.map((item, index) => (
        <div
          key={item.assetId || item.src}
          className={styles.overlapCard}
          style={{ zIndex: index }}
        >
          <ChatImage src={item.src} alt="生成的图片" preview={preview} />
        </div>
      ))}
    </div>
  );
}
