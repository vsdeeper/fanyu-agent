import type { LocalUploadItem } from '@/lib/shared/client/upload-items';

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
export async function readUploadItemAsDataUrl(item: LocalUploadItem): Promise<string> {
  return item.file ? readFileAsDataUrl(item.file) : readUrlAsDataUrl(item.previewUrl);
}

/** 读取新上传 txt/md 或已持久化资料，统一产出 UTF-8 正文。 */
export async function readUploadItemAsText(item: LocalUploadItem): Promise<string> {
  if (item.file) return item.file.text();
  const response = await fetch(item.previewUrl);
  if (!response.ok) throw new Error('读取历史资料失败');
  return response.text();
}

/** 将上传项剥离 file（不可序列化），并把本地 blob URL 转为 data URL 供服务端落盘。 */
export async function serializeUploadItem<T extends LocalUploadItem>(
  item: T,
): Promise<Omit<T, 'file'>> {
  const { file, ...rest } = item;
  return { ...rest, previewUrl: file ? await readFileAsDataUrl(file) : item.previewUrl };
}
