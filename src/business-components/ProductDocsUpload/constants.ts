import {
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons';

export const MAX_PRODUCT_DOCS = 6;
export const MAX_PRODUCT_DOC_BYTES = 10 * 1024 * 1024;
export const PRODUCT_DOC_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx';
export const PRODUCT_DOC_SUBTITLE = '支持图片、PDF / TXT / MD / DOCX';
export const PRODUCT_DOC_HINT = '可上传产品说明、卖点清单、品牌资料或参考图';
export const DOC_TOO_LARGE_WARNING = '单个资料不超过 10MB';
export const DOC_TYPE_WARNING = '仅支持图片、PDF、TXT、MD、DOCX';

export const PRODUCT_DOC_EXT_SET = new Set([
  'pdf',
  'txt',
  'md',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
]);
export const PRODUCT_DOC_IMAGE_EXT_SET = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export const DOC_ICON_BY_EXT = {
  pdf: FilePdfOutlined,
  docx: FileWordOutlined,
  md: FileMarkdownOutlined,
  txt: FileTextOutlined,
  image: FileImageOutlined,
  default: FileOutlined,
} as const;
