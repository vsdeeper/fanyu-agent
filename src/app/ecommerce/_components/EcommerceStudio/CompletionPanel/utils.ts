import { zip } from 'fflate';
import { ECOMMERCE_DESIGN_TYPES } from '@/app/api/ecommerce/_shared/constants';
import type { DesignResultGroups, StudioResultImage } from '../types';
import {
  EXPORT_ARCHIVE_NAME,
  IMAGE_EXTENSION_BY_MEDIA_TYPE,
  VISUAL_GROUP_TITLE,
} from './constants';

/** 仅保留有可用 URL 的已生成图片。 */
export function getGeneratedImages(
  images: readonly StudioResultImage[],
): Array<StudioResultImage & { url: string }> {
  return images.filter(
    (item): item is StudioResultImage & { url: string } =>
      item.status === 'ready' && Boolean(item.url),
  );
}

/** 过滤各设计类型中的未完成与失败结果。 */
export function getGeneratedDesignGroups(groups: DesignResultGroups): DesignResultGroups {
  const generated: DesignResultGroups = {};
  for (const designType of ECOMMERCE_DESIGN_TYPES) {
    const images = getGeneratedImages(groups[designType] ?? []);
    if (images.length > 0) generated[designType] = images;
  }
  return generated;
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
  return {
    mediaType,
    bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  };
}

/** 将一类图片按稳定序号写入待打包文件表。 */
function appendGroupFiles(
  files: Record<string, Uint8Array>,
  groupName: string,
  prefix: string,
  images: readonly StudioResultImage[],
): void {
  getGeneratedImages(images).forEach((image, index) => {
    const { mediaType, bytes } = decodeImageDataUrl(image.url);
    const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'png';
    files[`${groupName}/${prefix}-${String(index + 1).padStart(2, '0')}.${extension}`] = bytes;
  });
}

/** 将营销主视觉与各类视觉设计打包为 ZIP 字节。 */
export function createResultArchive(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  appendGroupFiles(files, VISUAL_GROUP_TITLE, 'visual', visualImages);
  ECOMMERCE_DESIGN_TYPES.forEach((designType) => {
    appendGroupFiles(files, designType, 'design', designGroups[designType] ?? []);
  });

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

/** 在浏览器中生成并下载电商设计成果 ZIP。 */
export async function exportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
): Promise<void> {
  const archive = await createResultArchive(visualImages, designGroups);
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = EXPORT_ARCHIVE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}
