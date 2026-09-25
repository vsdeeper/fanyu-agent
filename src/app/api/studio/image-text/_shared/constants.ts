/** 图文内容 SSE 事件名。与 consumeAnalyzeSse 识别的 text / done / error 一致。 */
export const IMAGE_TEXT_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

/** 内容请求最多接收的素材图张数，与上传组件上限一致。 */
export const IMAGE_TEXT_MAX_MATERIALS = 6;

/** 左侧「内容」字段字数上限。 */
export const IMAGE_TEXT_MAX_CONTENT_LENGTH = 8000;

/** 左侧「我的要求」（内容步）字数上限，与生成步一致。 */
export const IMAGE_TEXT_MAX_CONTENT_REQUIREMENT_LENGTH = 500;

/**
 * 旧任务可能仍用 `## 配文` 小节；新格式在标题后直接写 `> 摘要`。
 * 解析时两者都认。
 */
export const IMAGE_TEXT_CAPTION_SECTION_TITLE = '配文';
