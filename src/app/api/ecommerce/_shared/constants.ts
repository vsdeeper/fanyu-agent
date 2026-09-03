/** 工作台历史上曾写入 chats 的 id 前缀；listChats 据此从侧栏排除遗留行 */
export const ECOM_CHAT_ID_PREFIX = 'ecom-';

/** POST /api/ecommerce/analyze 自定义 SSE 事件名 */
export const ANALYZE_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

export const DEFAULT_MODEL_REQUIREMENT =
  '根据产品品类与主视觉调性自动匹配模特性别、年龄和气质；默认中国模特，体态匀称，妆发自然干净，造型简洁高级且不抢产品；同一模特、同一造型。可穿戴品须正确穿戴并清晰展示，非可穿戴品不得出现、手持或操作产品。';
