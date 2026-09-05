import { zip } from 'fflate';
import { ECOMMERCE_DESIGN_TYPES } from '@/app/api/ecommerce/_shared/constants';
import { groupResultImagesByRatio } from '../ResultPanel/utils';
import type { DesignResultGroups, StudioResultImage } from '../types';
import {
  ANALYSIS_FILE_NAME,
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

/** 将商业分析正文写入待打包文件表；直接在 ZIP 根目录输出单文件 .md。 */
function appendAnalysisFile(files: Record<string, Uint8Array>, analysisText: string): void {
  if (!analysisText.trim()) return;
  files[ANALYSIS_FILE_NAME] = new TextEncoder().encode(analysisText);
}

/** 将营销主视觉、各类视觉设计与商业分析打包为 ZIP 字节。 */
export function createResultArchive(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  return Promise.all([
    appendGroupFiles(files, VISUAL_GROUP_TITLE, visualImages),
    ...ECOMMERCE_DESIGN_TYPES.map((designType) =>
      appendGroupFiles(files, designType, designGroups[designType] ?? []),
    ),
  ]).then(() => {
    appendAnalysisFile(files, analysisText);
    return new Promise((resolve, reject) => {
      zip(files, { level: 0 }, (error, archive) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(archive);
      });
    });
  });
}

/** 在浏览器中生成并下载电商设计成果 ZIP。 */
export async function exportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
): Promise<void> {
  const archive = await createResultArchive(visualImages, designGroups, analysisText);
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = EXPORT_ARCHIVE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}
