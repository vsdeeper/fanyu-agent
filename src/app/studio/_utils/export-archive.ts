import { zip } from 'fflate';
import {
  getGeneratedImages,
  groupResultImagesByRatio,
  type StudioResultImage,
} from './result-images';

export const IMAGE_EXTENSION_BY_MEDIA_TYPE: Readonly<Record<string, string>> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** 解析 data URL，并返回媒体类型与原始字节。 */
export function decodeImageDataUrl(dataUrl: string): {
  mediaType: string;
  bytes: Uint8Array;
} {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error('无效的图片数据');
  const mediaType = match[1].toLowerCase();
  const payload = match[3];
  if (match[2]) {
    const binary = atob(payload);
    return {
      mediaType,
      bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    };
  }
  return { mediaType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
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

/** 将一组图片按比例拆成二级子组写入待打包文件表；文件名「比例-序号」，每比例内序号从 01 起。 */
export async function appendGroupFiles(
  files: Record<string, Uint8Array>,
  groupName: string,
  images: readonly StudioResultImage[],
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

/** 把文件表打成 ZIP 字节。 */
export function zipFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
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

/** 在浏览器中下载 ZIP。 */
export function downloadZipBlob(archive: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
