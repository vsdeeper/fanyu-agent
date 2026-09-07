import type { ResultImage } from '../types';
import {
  appendGroupFiles,
  decodeImageDataUrl,
  downloadZipBlob,
  zipFiles,
} from '@/app/studio/_utils/export-archive';
import { getGeneratedImages } from '@/app/studio/_utils/result-images';
import { EXPORT_ARCHIVE_NAME, MULTIVIEW_GROUP_TITLE, REFINE_GROUP_TITLE } from './constants';

export { decodeImageDataUrl, getGeneratedImages };

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
  return zipFiles(files);
}

/** 在浏览器中生成并下载产品精修成果 ZIP。 */
export async function exportResultImages(
  refineImages: readonly ResultImage[],
  multiviewImages: readonly ResultImage[],
): Promise<void> {
  downloadZipBlob(await createResultArchive(refineImages, multiviewImages), EXPORT_ARCHIVE_NAME);
}
