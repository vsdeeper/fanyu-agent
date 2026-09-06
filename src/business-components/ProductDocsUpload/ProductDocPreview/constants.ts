/** 预览抽屉宽度：随视口收缩的响应式宽度 */
export const PRODUCT_DOC_PREVIEW_WIDTH = 'max(420px, min(44vw, 760px))';

export const MARKDOWN_DISABLE_STYLES: Array<'code' | 'img'> = ['code', 'img'];

export const MARKDOWN_STREAMING_OFF = { hasNextChunk: false };

/** 稳定引用，避免 XMarkdown useStreaming 每次把 components 默认成新 {} 触发 effect 循环 */
export const MARKDOWN_COMPONENTS = {};

/** DOCX 等暂不支持在线预览时，提示用户下载查看 */
export const PREVIEW_UNSUPPORTED = '该格式暂不支持在线预览，请下载后查看';

/** 正文加载失败时面板内提示 */
export const PREVIEW_LOAD_ERROR = '无法加载文件预览';
