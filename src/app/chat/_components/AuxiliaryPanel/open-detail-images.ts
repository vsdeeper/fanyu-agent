import 'client-only';

import { useAuxiliaryPanelStore } from './store';

/**
 * 打开右侧「详情图分组」侧栏：把同簇详情图按顺序放入，固定 360px，竖排滚动查看。
 * 与 open-source-list 同款：经 store.openPanel 注入 detail-images 载荷。
 */
export function openDetailImages(
  title: string,
  images: ReadonlyArray<{ src: string; key?: string }>,
): void {
  useAuxiliaryPanelStore
    .getState()
    .openPanel({ type: 'detail-images', title, images: [...images] });
}
