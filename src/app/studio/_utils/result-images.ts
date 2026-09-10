export type StudioResultImage = {
  /** 稳定身份：槽位创建时生成、随快照持久化；选中与事件对齐一律按它匹配，不用数组下标 */
  id: string;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
  /** 主图按主题分组时的主题 id */
  themeId?: string;
  /** 主图按主题分组时的主题标题 */
  themeTitle?: string;
};

/** 旧快照的结果图只有 index 没有 id，用它派生确定性身份。 */
export function legacyResultImageId(index: number): string {
  return `legacy-${index}`;
}

/**
 * 读取快照里的结果图数组：保留全部可用图片，只补齐缺失的身份与形状。
 *
 * 旧数据没有 id，必须补一个**确定性**派生值——若用随机值，`restoreBatchImages` 的两次调用
 * （渲染函数体与结算各一次）会产出不同身份，`mergeBatchImages` 按 id 合并时把整批图重复追加一份。
 * 派生值取旧的 `index` 字段值而非数组位置：取消生成会让数组收缩留洞，位置不等于 index。
 * 本函数只保证旧图能被渲染与合并，不恢复旧的选中态。
 */
export function normalizeResultImages(value: unknown): StudioResultImage[] {
  if (!Array.isArray(value)) return [];
  const images: StudioResultImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<StudioResultImage> & { index?: unknown };
    const id =
      typeof raw.id === 'string' && raw.id
        ? raw.id
        : typeof raw.index === 'number'
          ? legacyResultImageId(raw.index)
          : '';
    if (!id) continue;
    images.push({
      id,
      aspectRatio: typeof raw.aspectRatio === 'string' ? raw.aspectRatio : '',
      status: raw.status === 'ready' || raw.status === 'failed' ? raw.status : 'pending',
      ...(typeof raw.url === 'string' ? { url: raw.url } : {}),
      ...(typeof raw.error === 'string' ? { error: raw.error } : {}),
      ...(typeof raw.themeId === 'string' ? { themeId: raw.themeId } : {}),
      ...(typeof raw.themeTitle === 'string' ? { themeTitle: raw.themeTitle } : {}),
    });
  }
  return images;
}

/**
 * 校验单个选中 id：必须是非空字符串且仍在该结果集里，否则视为未选中。
 * 入参取 unknown 是因为读快照时拿到的是未校验的 JSON（旧数据此处是数字下标）。
 */
export function pickExistingImageId(
  images: readonly StudioResultImage[],
  id: unknown,
): string | null {
  return typeof id === 'string' && id && images.some((image) => image.id === id) ? id : null;
}

/** 过滤掉结果集里已不存在的选中 id（取消生成会丢图，避免快照里越积越多的死 id）。 */
export function keepExistingImageIds(
  images: readonly StudioResultImage[],
  ids: readonly string[],
): string[] {
  const existing = new Set(images.map((image) => image.id));
  return ids.filter((id) => existing.has(id));
}

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
  selectedId: string | null,
): string | null {
  const [url] = getSelectedImageUrls(images, selectedId === null ? [] : [selectedId]);
  return url ?? null;
}

/** 按点选顺序返回已就绪的结果图 URL。 */
export function getSelectedImageUrls(
  images: readonly StudioResultImage[],
  selectedIds: readonly string[],
): string[] {
  const urls: string[] = [];
  for (const selectedId of selectedIds) {
    const image = images.find((item) => item.id === selectedId);
    if (image?.status === 'ready' && image.url) urls.push(image.url);
  }
  return urls;
}
