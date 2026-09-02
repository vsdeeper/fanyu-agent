/** 工作台历史上曾写入 chats 的 id 前缀；listChats 据此从侧栏排除遗留行 */
export const ECOM_CHAT_ID_PREFIX = 'ecom-';

/** POST /api/ecommerce/analyze 自定义 SSE 事件名 */
export const ANALYZE_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;
