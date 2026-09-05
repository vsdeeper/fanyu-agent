import { zip } from 'fflate';
import type { ResultImage } from '../types';
import {
  EXPORT_ARCHIVE_NAME,
  IMAGE_EXTENSION_BY_MEDIA_TYPE,
  MULTIVIEW_GROUP_TITLE,
  REFINE_GROUP_TITLE,
} from './constants';

/** 仅保留有可用 URL 的已生成图片。 */
export function getGeneratedImages(
  images: readonly ResultImage[],
): Array<ResultImage & { url: string }> {
  return images.filter(
    (item): item is ResultImage & { url: string } => item.status === 'ready' && Boolean(item.url),
  );
}

/** 解析 data URL，并返回媒体类型与原始字节。 */
export function decodeImageDataUrl(dataUrl: string): {
  mediaType: string;
  bytes: Uint8Array;
} {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error('无效的图片数据');
  const mediaType = match[1].toLowerCase();
  const payload = match[3];
  if (!match[2]) {
    return { mediaType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
  }
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { mediaType, bytes };
}

/** 将一类图片按稳定序号写入待打包文件表。 */
function appendGroupFiles(
  files: Record<string, Uint8Array>,
  groupName: string,
  prefix: string,
  images: readonly ResultImage[],
): void {
  getGeneratedImages(images).forEach((image, index) => {
    const { mediaType, bytes } = decodeImageDataUrl(image.url);
    const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'png';
    files[`${groupName}/${prefix}-${String(index + 1).padStart(2, '0')}.${extension}`] = bytes;
  });
}

/** 将两类已生成图片打包为 ZIP 字节。 */
export function createResultArchive(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};

  appendGroupFiles(files, REFINE_GROUP_TITLE, 'refine', refineImages);
  appendGroupFiles(files, MULTIVIEW_GROUP_TITLE, 'multiview', multiviewImages);

  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(archive);
    });
  });
}

/** 在浏览器中生成并下载产品精修成果 ZIP。 */
export async function exportResultImages(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
): Promise<void> {
  const archive = await createResultArchive(refineImages, multiviewImages);
  const blobBytes = new Uint8Array(archive);
  const url = URL.createObjectURL(new Blob([blobBytes], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = EXPORT_ARCHIVE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}
