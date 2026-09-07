export type StudioUploadItem = {
  uid: string;
  file?: File;
  previewUrl: string;
};

/** 追加本地图片并建立预览 URL，最多保留指定数量。 */
export function appendUploadItems<T extends StudioUploadItem>(
  current: T[],
  files: File[],
  max: number,
  createItem: (file: File, previewUrl: string) => T,
): T[] {
  const room = max - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => createItem(file, URL.createObjectURL(file)));
  return [...current, ...next];
}

/** 按 uid 移除图片并释放其预览 URL。 */
export function removeUploadItem<T extends StudioUploadItem>(current: T[], uid: string): T[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 释放一组本地图片的预览 URL。 */
export function revokeUploadItemUrls(items: readonly StudioUploadItem[]): void {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

/** 将本地文件读取为 API 可接收的 data URL。 */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** 将站内资产 URL 或已有 data URL 转为模型接口所需的 data URL。 */
export async function readUrlAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error('读取历史资产失败');
  return readFileAsDataUrl(await response.blob());
}

/** 读取新上传文件或已持久化资产，统一产出 data URL。 */
export async function readUploadItemAsDataUrl(item: StudioUploadItem): Promise<string> {
  return item.file ? readFileAsDataUrl(item.file) : readUrlAsDataUrl(item.previewUrl);
}

/** 将上传图剥离 file（不可序列化），并把本地 blob URL 转为 data URL 供服务端落盘。 */
export async function serializeUploadItem<T extends StudioUploadItem>(
  item: T,
): Promise<Omit<T, 'file'>> {
  const { file, ...rest } = item;
  return { ...rest, previewUrl: file ? await readFileAsDataUrl(file) : item.previewUrl };
}
