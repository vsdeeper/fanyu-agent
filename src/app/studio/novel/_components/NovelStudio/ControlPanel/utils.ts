import type { ProductDocUploadItem } from '@/app/studio/_components/ProductDocsUpload';
import { isNovelIdeaFile } from '@/app/api/studio/novel/_shared/idea-file';
import { MISSING_IDEA_WARNING } from '../constants';

/** 思路文件选择器：与服务端允许的 TXT / MD / PDF 对齐。 */
export function isAllowedIdeaFile(file: Pick<File, 'name' | 'type'>): boolean {
  return isNovelIdeaFile(file.name, file.type);
}

/** 思路文件与「我的想法」至少填一项。 */
export async function requireIdeaOrFile(
  idea: string | undefined,
  files: ProductDocUploadItem[] | undefined,
): Promise<void> {
  if (typeof idea === 'string' && idea.trim()) return;
  if (files && files.length > 0) return;
  throw new Error(MISSING_IDEA_WARNING);
}
