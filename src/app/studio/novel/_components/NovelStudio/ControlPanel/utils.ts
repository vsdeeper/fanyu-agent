import type { ProductDocUploadItem } from '@/app/studio/_components/ProductDocsUpload';
import { isNovelIdeaFile } from '@/app/api/studio/novel/_shared/idea-file';
import { MISSING_WORLDVIEW_WARNING } from '../constants';

/** 世界观设定选择器：与服务端允许的 TXT / MD / PDF 对齐。 */
export function isAllowedIdeaFile(file: Pick<File, 'name' | 'type'>): boolean {
  return isNovelIdeaFile(file.name, file.type);
}

/** 世界观设定至少一份。 */
export async function requireWorldviewFiles(
  files: ProductDocUploadItem[] | undefined,
): Promise<void> {
  if (files && files.length > 0) return;
  throw new Error(MISSING_WORLDVIEW_WARNING);
}
