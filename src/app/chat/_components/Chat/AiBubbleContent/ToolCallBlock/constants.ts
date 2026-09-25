import type { ComponentType } from 'react';
import {
  CloseCircleOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  PictureOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';

/** 工具名 → 中文名；generate_image 的 edit 模式在 utils 里另作「改图」 */
export const TOOL_LABELS: Record<string, string> = {
  generate_image: '生成图片',
  analyze_image: '识图',
  web_search: '联网搜索',
  save_design_md: '生成设计文档',
};

/** 工具名 → 状态图标；调用中由 Think 的 loading 覆盖，失败时统一换 FAILED_ICON */
export const TOOL_ICONS: Record<string, ComponentType> = {
  generate_image: FormatPainterOutlined,
  analyze_image: PictureOutlined,
  web_search: SearchOutlined,
  save_design_md: FileTextOutlined,
};

export const FALLBACK_TOOL_ICON: ComponentType = ToolOutlined;

export const FAILED_ICON: ComponentType = CloseCircleOutlined;

/** 展开后入参字段的中文名；未列出的字段直接用原始 key */
export const FIELD_LABELS: Record<string, string> = {
  mode: '模式',
  prompt: '提示词',
  model: '模型',
  sourceAssetIds: '源图',
  pastedImageIndexes: '粘贴图',
  strategy: '参考图策略',
  size: '尺寸',
  aspectRatio: '宽高比',
  transparent: '透明背景',
  quality: '画质',
  type: '图片类型',
  assetId: '图片',
  question: '问题',
  query: '关键词',
  queries: '关键词',
  url: '打开页面',
  content: '正文',
  fileName: '文件名',
};

/** 枚举入参取值的中文名 */
export const VALUE_LABELS: Record<string, Record<string, string>> = {
  mode: { generate: '生成', edit: '改图' },
  strategy: { merge: '合成一张', batch: '各出一张' },
};

/** 展开后单个字段值的最大字数：DESIGN.md 正文这类长文本只展示开头，全文另有文档卡片 */
export const VALUE_MAX_CHARS = 800;

/** generate_image 在 edit 模式下的标题 */
export const EDIT_IMAGE_LABEL = '改图';

/** 调用进行中标题追加的省略号 */
export const PENDING_TITLE_SUFFIX = '...';

/** 调用失败时标题追加的标记 */
export const FAILED_LABEL = '失败';
