import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import { appendGroupFiles, downloadZipBlob, zipFiles } from '@/app/studio/_utils/export-archive';
import { getGeneratedImages } from '@/app/studio/_utils/result-images';
import type { DesignResultGroups, StudioResultImage } from '../types';
import { ANALYSIS_FILE_NAME, EXPORT_ARCHIVE_NAME, VISUAL_GROUP_TITLE } from './constants';

export { getGeneratedImages };
export { getGeneratedDesignGroups } from '../utils';

/** 将商业分析正文写入待打包文件表；直接在 ZIP 根目录输出单文件 .md。 */
function appendAnalysisFile(files: Record<string, Uint8Array>, analysisText: string): void {
  if (!analysisText.trim()) return;
  files[ANALYSIS_FILE_NAME] = new TextEncoder().encode(analysisText);
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

/** 在浏览器中生成并下载电商设计成果 ZIP。 */
export async function exportResultImages(
  visualImages: readonly StudioResultImage[],
  designGroups: DesignResultGroups,
  analysisText: string,
): Promise<void> {
  downloadZipBlob(
    await createResultArchive(visualImages, designGroups, analysisText),
    EXPORT_ARCHIVE_NAME,
  );
}
