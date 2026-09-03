import {
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
} from '@ant-design/icons';

export const DOC_ICON_BY_EXT = {
  pdf: FilePdfOutlined,
  docx: FileWordOutlined,
  md: FileMarkdownOutlined,
  txt: FileTextOutlined,
  image: FileImageOutlined,
  default: FileOutlined,
} as const;
