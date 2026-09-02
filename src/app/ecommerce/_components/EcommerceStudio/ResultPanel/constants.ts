export const MARKDOWN_DISABLE_STYLES: Array<'code' | 'img'> = ['code', 'img'];

/** 距底部小于该像素视为贴底，流式输出继续跟随 */
export const PLAN_SCROLL_NEAR_BOTTOM_PX = 48;

export const MARKDOWN_STREAMING_ON = { hasNextChunk: true };

export const MARKDOWN_STREAMING_OFF = { hasNextChunk: false };

/** 稳定引用，避免 XMarkdown useStreaming 每次把 components 默认成新 {} 触发 effect 循环 */
export const MARKDOWN_COMPONENTS = {};
