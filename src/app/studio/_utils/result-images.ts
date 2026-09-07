export type StudioResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};

/** 将宽高比换算为固定宽度下的展示尺寸。 */
export function aspectRatioToSize(
  ratio: string,
  baseWidth: number,
): { width: number; height: number } {
  const match = /^(\d+):(\d+)$/.exec(ratio.trim());
  const width = match ? Number(match[1]) : 0;
  const height = match ? Number(match[2]) : 0;
  if (width <= 0 || height <= 0) return { width: baseWidth, height: baseWidth };
  return { width: baseWidth, height: Math.round((baseWidth * height) / width) };
}

/** 二级分类：把结果图按其比例拆成稳定顺序的子组，供按比例分组展示。 */
export function groupResultImagesByRatio<T extends StudioResultImage>(
  images: readonly T[],
): Array<{ aspectRatio: string; images: T[] }> {
  const order: string[] = [];
  const byRatio = new Map<string, T[]>();
  for (const image of images) {
    const key = image.aspectRatio;
    const bucket = byRatio.get(key);
    if (bucket) {
      bucket.push(image);
    } else {
      byRatio.set(key, [image]);
      order.push(key);
    }
  }
  return order.map((ratio) => ({ aspectRatio: ratio, images: byRatio.get(ratio)! }));
}

/** 判断结果集中是否至少有一张已生成图片。 */
export function hasReadyImage(images: readonly StudioResultImage[]): boolean {
  return images.some((item) => item.status === 'ready' && Boolean(item.url));
}

/** 仅保留有可用 URL 的已生成图片。 */
export function getGeneratedImages<T extends StudioResultImage>(
  images: readonly T[],
): Array<T & { url: string }> {
  return images.filter(
    (item): item is T & { url: string } => item.status === 'ready' && Boolean(item.url),
  );
}

/** 返回点选且已就绪的结果图 URL。 */
export function getSelectedImageUrl(
  images: readonly StudioResultImage[],
  selectedIndex: number | null,
): string | null {
  if (selectedIndex === null) return null;
  const image = images.find((item) => item.index === selectedIndex);
  return image?.status === 'ready' && image.url ? image.url : null;
}
