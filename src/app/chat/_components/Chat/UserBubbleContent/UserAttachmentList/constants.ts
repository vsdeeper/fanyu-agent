import {
  FileMarkdownOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from '@ant-design/icons';

/** 用户附件无文件名时的兜底展示名 */
export const USER_FILE_FALLBACK_NAME = '未知';

/** 与 GenerateImageBlock 缩略图边长对齐 */
export const USER_ATTACHMENT_IMAGE_SIZE = 60;

export const PDF_MEDIA_TYPE = 'application/pdf';

export const WORD_MEDIA_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MARKDOWN_MEDIA_TYPES = new Set(['text/markdown', 'text/plain']);

export const ICON_BY_KIND = {
  pdf: FilePdfOutlined,
  word: FileWordOutlined,
  markdown: FileMarkdownOutlined,
  default: FileOutlined,
} as const;
