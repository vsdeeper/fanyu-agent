import { FileMarkdownOutlined, FileOutlined, FileTextOutlined } from '@ant-design/icons';

export const MAX_PRODUCT_DOCS = 6;
export const MAX_PRODUCT_DOC_BYTES = 10 * 1024 * 1024;
export const PRODUCT_DOC_ACCEPT = '.txt,.md';
export const PRODUCT_DOC_SUBTITLE = '支持 TXT / MD';
export const PRODUCT_DOC_HINT = '可上传产品说明、卖点清单或品牌资料';
export const PRODUCT_DOC_LABEL = '产品资料';
export const DOC_TOO_LARGE_WARNING = '单个资料不超过 10MB';
export const DOC_TYPE_WARNING = '仅支持 TXT、MD';

export const PRODUCT_DOC_EXT_SET = new Set(['txt', 'md']);

export const DOC_ICON_BY_EXT = {
  md: FileMarkdownOutlined,
  txt: FileTextOutlined,
  default: FileOutlined,
} as const;
