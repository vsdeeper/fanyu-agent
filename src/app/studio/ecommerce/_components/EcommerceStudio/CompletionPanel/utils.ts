import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { ThemeDefinition } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import { appendGroupFiles, downloadZipBlob, zipFiles } from '@/app/studio/_utils/export-archive';
import { getGeneratedImages, groupResultImagesByTheme } from '@/app/studio/_utils/result-images';
import type { DesignResultGroups, StudioResultImage } from '../types';
import { ANALYSIS_FILE_NAME, EXPORT_ARCHIVE_NAME_SUFFIX, VISUAL_GROUP_TITLE } from './constants';

export { getGeneratedImages };
export { getGeneratedDesignGroups } from '../utils';

/** 按任务类型生成导出 ZIP 文件名，如「详情图设计成果.zip」。 */
export function toExportArchiveName(taskType: EcommerceTaskType): string {
  return `${taskType}${EXPORT_ARCHIVE_NAME_SUFFIX}`;
}

/** 将商业分析正文写入待打包文件表；直接在 ZIP 根目录输出单文件 .md。 */
function appendAnalysisFile(files: Record<string, Uint8Array>, analysisText: string): void {
  if (!analysisText.trim()) return;
  files[ANALYSIS_FILE_NAME] = new TextEncoder().encode(analysisText);
}

/** 按主题顺序取出点选图片，同主题内保持点选先后。 */
export function orderSelectedImagesByTheme(
  images: readonly StudioResultImage[],
  selectedIndexes: readonly number[],
  themes: readonly ThemeDefinition[],
): Array<StudioResultImage & { url: string }> {
  const selected = new Set(selectedIndexes);
  const picked = getGeneratedImages(images).filter((image) => selected.has(image.index));
  const grouped = groupResultImagesByTheme(picked, themes);
  return grouped.flatMap((group) => group.images);
}

/**
 * 每主题最多保留一张：再点同主题则替换；再点已选则取消。
 */
export function toggleExportIndexByTheme(
  current: readonly number[],
  index: number,
  images: readonly StudioResultImage[],
): number[] {
  const image = images.find((item) => item.index === index);
  if (!image || image.status !== 'ready' || !image.url) return [...current];
  const themeKey = image.themeId || image.themeTitle || '';
  if (current.includes(index)) return current.filter((id) => id !== index);
  return [
    ...current.filter((id) => {
      const other = images.find((item) => item.index === id);
      const otherKey = other?.themeId || other?.themeTitle || '';
      return otherKey !== themeKey;
    }),
    index,
  ];
}

/** 将营销主视觉、各类视觉设计与商业分析打包为 ZIP 字节。仅一组图片时不套类型文件夹。 */
export async function createResultArchive(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const packedGroups: { name: string; images: readonly StudioResultImage[] }[] = [];
  if (getGeneratedImages(visualImages).length > 0) {
    packedGroups.push({ name: VISUAL_GROUP_TITLE, images: visualImages });
  }
  for (const taskType of ECOMMERCE_TASK_TYPES) {
    const images = designGroups[taskType] ?? [];
    if (getGeneratedImages(images).length > 0) {
      packedGroups.push({ name: taskType, images });
    }
  }
  const flatten = packedGroups.length === 1;
  await Promise.all(
    packedGroups.map((group) => appendGroupFiles(files, flatten ? '' : group.name, group.images)),
  );
  appendAnalysisFile(files, analysisText);
  return zipFiles(files);
}

/** 仅打包点选图片，不附商业分析。 */
export async function createSelectedImageArchive(
  images: readonly StudioResultImage[],
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  await appendGroupFiles(files, '', images);
  return zipFiles(files);
}

/** 在浏览器中生成并下载电商设计成果 ZIP。 */
export async function exportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
  taskType: EcommerceTaskType,
): Promise<void> {
  downloadZipBlob(
    await createResultArchive(visualImages, designGroups, analysisText),
    toExportArchiveName(taskType),
  );
}

/** 在浏览器中下载点选详情图 ZIP。 */
export async function exportSelectedResultImages(
  images: readonly StudioResultImage[],
  taskType: EcommerceTaskType,
): Promise<void> {
  downloadZipBlob(await createSelectedImageArchive(images), toExportArchiveName(taskType));
}
