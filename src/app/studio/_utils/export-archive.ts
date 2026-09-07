import { zip } from 'fflate';
import { getGeneratedImages, type StudioResultImage } from './result-images';

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

type GeneratedResultImage = StudioResultImage & { url: string };

/** 导出文件名主体：有主题时「主题-比例-编号」，否则「比例-编号」。编号从 1 起、两位补零。 */
export function toExportImageBaseName(
  aspectRatio: string,
  seq: number,
  themeTitle?: string,
): string {
  const padded = String(seq).padStart(2, '0');
  const theme = themeTitle?.trim();
  return theme ? `${theme}-${aspectRatio}-${padded}` : `${aspectRatio}-${padded}`;
}

/** 按主题与比例拆成导出子组，组内顺序与输入一致；无主题时等价于只按比例分组。 */
function groupGeneratedImagesForExport(
  images: readonly GeneratedResultImage[],
): Array<{ themeTitle: string; aspectRatio: string; images: GeneratedResultImage[] }> {
  const order: string[] = [];
  const byKey = new Map<string, GeneratedResultImage[]>();
  for (const image of images) {
    const themeTitle = image.themeTitle?.trim() ?? '';
    const key = `${themeTitle}\0${image.aspectRatio}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(image);
    } else {
      byKey.set(key, [image]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const bucket = byKey.get(key)!;
    return {
      themeTitle: bucket[0]?.themeTitle?.trim() ?? '',
      aspectRatio: bucket[0]!.aspectRatio,
      images: bucket,
    };
  });
}

/** 将一组图片按主题与比例写入待打包文件表；每组内编号从 01 起。groupName 为空时落在 ZIP 根目录。 */
export async function appendGroupFiles(
  files: Record<string, Uint8Array>,
  groupName: string,
  images: readonly StudioResultImage[],
): Promise<void> {
  const prefix = groupName ? `${groupName}/` : '';
  await Promise.all(
    groupGeneratedImagesForExport(getGeneratedImages(images)).flatMap(
      ({ themeTitle, aspectRatio, images: groupImages }) =>
        groupImages.map(async (image, index) => {
          const { mediaType, bytes } = await readImageBytes(image.url);
          const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'png';
          files[
            `${prefix}${toExportImageBaseName(aspectRatio, index + 1, themeTitle)}.${extension}`
          ] = bytes;
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
