import { message } from 'antd';
import { COMING_SOON_MESSAGE, MAX_PRODUCT_IMAGES } from './constants';
import type { ProductImageItem } from './types';

/** 占位能力提示，本轮不接通分析/生图 */
export function notifyComingSoon(): void {
  message.info(COMING_SOON_MESSAGE);
}

/**
 * 将选择的文件追加为本地预览项；超出上限的部分丢弃。
 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
): ProductImageItem[] {
  const room = MAX_PRODUCT_IMAGES - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  return [...current, ...next];
}

/** 按 uid 移除预览项并释放 object URL */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 卸载时释放全部 object URL */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
