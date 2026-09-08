export type StudioResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
  /** 主图按主题分组时的主题 id */
  themeId?: string;
  /** 主图按主题分组时的主题标题 */
  themeTitle?: string;
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

/**
 * 主图一级分类：按主题标题分组，顺序跟随 themeOrder（仅渲染有图的主题）。
 */
export function groupResultImagesByTheme<T extends StudioResultImage>(
  images: readonly T[],
  themeOrder: readonly { id: string; title: string }[],
): Array<{ themeId: string; themeTitle: string; images: T[] }> {
  const byTheme = new Map<string, T[]>();
  for (const image of images) {
    const key = image.themeId || image.themeTitle || '';
    if (!key) continue;
    const bucket = byTheme.get(key);
    if (bucket) bucket.push(image);
    else byTheme.set(key, [image]);
  }

  const groups: Array<{ themeId: string; themeTitle: string; images: T[] }> = [];
  for (const theme of themeOrder) {
    const matched = byTheme.get(theme.id) ?? byTheme.get(theme.title);
    if (!matched?.length) continue;
    groups.push({ themeId: theme.id, themeTitle: theme.title, images: matched });
    byTheme.delete(theme.id);
    byTheme.delete(theme.title);
  }
  for (const [key, leftover] of byTheme) {
    if (!leftover.length) continue;
    groups.push({
      themeId: key,
      themeTitle: leftover[0]?.themeTitle || leftover[0]?.themeId || key,
      images: leftover,
    });
  }
  return groups;
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
  const [url] = getSelectedImageUrls(images, selectedIndex === null ? [] : [selectedIndex]);
  return url ?? null;
}

/** 按点选顺序返回已就绪的结果图 URL。 */
export function getSelectedImageUrls(
  images: readonly StudioResultImage[],
  selectedIndexes: readonly number[],
): string[] {
  const urls: string[] = [];
  for (const selectedIndex of selectedIndexes) {
    const image = images.find((item) => item.index === selectedIndex);
    if (image?.status === 'ready' && image.url) urls.push(image.url);
  }
  return urls;
}
