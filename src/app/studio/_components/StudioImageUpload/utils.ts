import type { StudioImageUploadItem } from './types';

/** 由本地文件建立上传项：预览用 object URL，元信息取自 File 供落盘前展示与序列化。 */
export function createStudioImageUploadItem(file: File, previewUrl: string): StudioImageUploadItem {
  return {
    uid: crypto.randomUUID(),
    file,
    previewUrl,
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    size: file.size,
  };
}

/** 返回本地文件或历史资产的显示名称。 */
export function getStudioImageUploadItemName(item: StudioImageUploadItem): string {
  return item.file?.name ?? item.name ?? '图片';
}
