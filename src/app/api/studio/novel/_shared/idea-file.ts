/** 思路文件份数上限。调研、设定、结构共用。 */
export const NOVEL_MAX_IDEA_FILES = 3;

const IDEA_FILE_EXTS = new Set(['txt', 'md', 'pdf']);

/** 从文件名取小写扩展名；无扩展名返回空串。 */
function toExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
}

/** 选题调研思路文件：TXT / MD 进正文，PDF 由模型直接阅读。 */
export function isNovelIdeaFile(filename: string, mediaType?: string): boolean {
  if (
    mediaType === 'text/plain' ||
    mediaType === 'text/markdown' ||
    mediaType === 'application/pdf'
  ) {
    return true;
  }
  return IDEA_FILE_EXTS.has(toExt(filename));
}

/** 是否应作为 PDF 附件交给模型，而不是抽成纯文本。 */
export function isNovelIdeaPdf(filename: string, mediaType?: string): boolean {
  return mediaType === 'application/pdf' || toExt(filename) === 'pdf';
}
