import { openFilePreview } from '@/app/chat/_components/AuxiliaryPanel/open-file-preview';
import { isPreviewableFile } from '@/app/chat/_components/AuxiliaryPanel/file-preview';
import { DESIGN_MD_MIME_TYPE } from '@/app/api/docs/_shared/constants';

/**
 * DESIGN.md 可预览时返回打开面板的回调。
 */
export function bindDesignMdPreview(
  fileName: string,
  href: string,
  byteSize?: number,
): (() => void) | undefined {
  if (!isPreviewableFile(fileName, DESIGN_MD_MIME_TYPE)) return undefined;
  return () =>
    openFilePreview({
      fileName,
      mediaType: DESIGN_MD_MIME_TYPE,
      href,
      byteSize,
    });
}
