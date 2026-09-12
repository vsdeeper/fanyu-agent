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
  selectedIds: readonly string[],
  themes: readonly ThemeDefinition[],
): Array<StudioResultImage & { url: string }> {
  const selected = new Set(selectedIds);
  const picked = getGeneratedImages(images).filter((image) => selected.has(image.id));
  const grouped = groupResultImagesByTheme(picked, themes);
  return grouped.flatMap((group) => group.images);
}

/**
 * 每主题最多保留一张：再点同主题则替换；再点已选则取消。
 */
export function toggleExportSelectedIdByTheme(
  current: readonly string[],
  id: string,
  images: readonly StudioResultImage[],
): string[] {
  const image = images.find((item) => item.id === id);
  if (!image || image.status !== 'ready' || !image.url) return [...current];
  const themeKey = image.themeId || image.themeTitle || '';
  if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
  return [
    ...current.filter((selectedId) => {
      const other = images.find((item) => item.id === selectedId);
      const otherKey = other?.themeId || other?.themeTitle || '';
      return otherKey !== themeKey;
    }),
    id,
  ];
}

/**
 * 主图完成页的自由多选：未选则追加、已选则取消，不限每主题张数。
 * 与 `toggleExportSelectedIdByTheme` 的差别只在每主题张数 —— 详情图要把同主题的图上下拼成
 * 一张长图，故每主题至多一张（同主题再点即替换）；主图同主题会出多张，须能同时选中。
 */
export function toggleExportSelectedId(
  current: readonly string[],
  id: string,
  images: readonly StudioResultImage[],
): string[] {
  const image = images.find((item) => item.id === id);
  if (!image || image.status !== 'ready' || !image.url) return [...current];
  return current.includes(id)
    ? current.filter((selectedId) => selectedId !== id)
    : [...current, id];
}

/**
 * 「全选」的可选 id 集合，按主题顺序展开。
 * 走与结果网格相同的主题分组，保证「网格里看得见的就能被全选选中」；
 * 无主题标记的图网格本就不展示，故不进集合。
 */
export function getSelectableExportIds(
  images: readonly StudioResultImage[],
  themes: readonly ThemeDefinition[],
): string[] {
  return groupResultImagesByTheme(getGeneratedImages(images), themes).flatMap((group) =>
    group.images.map((image) => image.id),
  );
}

/** 可选集合非空且已全部选中才算「已全选」；空集合返回 false，避免按钮错显「取消全选」。 */
export function isAllExportSelected(
  current: readonly string[],
  selectableIds: readonly string[],
): boolean {
  return selectableIds.length > 0 && selectableIds.every((id) => current.includes(id));
}

/** 全选 / 取消全选：已全选则清空，否则置为全部可选 id。 */
export function toggleAllExportSelectedIds(
  current: readonly string[],
  selectableIds: readonly string[],
): string[] {
  return isAllExportSelected(current, selectableIds) ? [] : [...selectableIds];
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

/** 仅打包点选图片，平铺在 ZIP 根目录；不附任何分析文档。 */
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

/** 在浏览器中下载点选图片 ZIP。 */
export async function exportSelectedResultImages(
  images: readonly StudioResultImage[],
  taskType: EcommerceTaskType,
): Promise<void> {
  downloadZipBlob(await createSelectedImageArchive(images), toExportArchiveName(taskType));
}
