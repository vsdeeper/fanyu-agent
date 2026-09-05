import { zip } from 'fflate';
import type { ResultImage } from '../types';
import { groupResultImagesByRatio } from '../utils';
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

/** 读取新生成的 data URL 或已持久化的站内资产 URL。 */
export async function readImageBytes(source: string): Promise<{
  mediaType: string;
  bytes: Uint8Array;
}> {
  if (source.startsWith('data:')) return decodeImageDataUrl(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error('读取生成物料失败');
  return {
    mediaType: response.headers.get('content-type')?.split(';')[0] ?? 'image/png',
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

/** 将一类图片按比例拆成二级子组写入待打包文件表；文件名「比例-序号」，每比例内序号从 01 起。 */
async function appendGroupFiles(
  files: Record<string, Uint8Array>,
  groupName: string,
  images: readonly ResultImage[],
): Promise<void> {
  await Promise.all(
    groupResultImagesByRatio(getGeneratedImages(images)).flatMap(
      ({ aspectRatio, images: ratioImages }) =>
        ratioImages.map(async (image, index) => {
          const { mediaType, bytes } = await readImageBytes(image.url);
          const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'png';
          const seq = String(index + 1).padStart(2, '0');
          files[`${groupName}/${aspectRatio}-${seq}.${extension}`] = bytes;
        }),
    ),
  );
}

/** 将两类已生成图片打包为 ZIP 字节。 */
export async function createResultArchive(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};

  await Promise.all([
    appendGroupFiles(files, REFINE_GROUP_TITLE, refineImages),
    appendGroupFiles(files, MULTIVIEW_GROUP_TITLE, multiviewImages),
  ]);

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
