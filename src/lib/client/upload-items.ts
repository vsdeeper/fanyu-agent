import 'client-only';

/** 本地选中文件在浏览器端的统一形态：`file` 仅在本次会话内有效，`previewUrl` 是 object URL 或站内资产 URL。 */
export type LocalUploadItem = {
  uid: string;
  file?: File;
  previewUrl: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

/** 追加本地文件并建立预览 URL，最多保留指定数量。 */
export function appendLocalUploadItems<T extends LocalUploadItem>(
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

/** 按 uid 移除并释放其预览 URL。 */
export function removeLocalUploadItem<T extends LocalUploadItem>(current: T[], uid: string): T[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 释放一组本地文件的预览 URL。重复释放同一个 URL 是幂等的。 */
export function revokeLocalUploadItemUrls(items: readonly LocalUploadItem[]): void {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

/**
 * 用服务端回的资产项替换本地项之后，回收被顶掉的本地预览 URL。
 *
 * 落盘回写会把本地 object URL 换成资产 URL，此后没人再引用那个 object URL；
 * 卸载清理只看得见 store 里的当前值，也救不回它，所以必须在这里就地释放。
 * 按 URL 而不是 uid 判断：回写保留 uid，只有 URL 变了。
 */
export function revokeReplacedLocalUploadItemUrls(
  previous: readonly LocalUploadItem[],
  next: readonly LocalUploadItem[],
): void {
  const keptUrls = new Set(next.map((item) => item.previewUrl));
  for (const item of previous) {
    if (item.file && !keptUrls.has(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
  }
}

/**
 * antd Upload `beforeUpload` 会对每个文件回调一次；只在首个文件时取出整批，避免重复追加。
 */
export function filesFromBeforeUpload(file: File, fileList: File[]): File[] {
  return file === fileList[0] ? [...fileList] : [];
}

/**
 * 拦截本地选中文件交给 onAppend，并始终阻止 antd 默认上传。
 */
export function interceptLocalFiles(
  file: File,
  fileList: File[],
  onAppend: (files: File[]) => void,
): false {
  const files = filesFromBeforeUpload(file, fileList);
  if (files.length > 0) {
    onAppend(files);
  }
  return false;
}
