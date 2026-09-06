/** 工作台历史上曾写入 chats 的 id 前缀；listChats 据此从侧栏排除遗留行 */
export const ECOM_CHAT_ID_PREFIX = 'ecom-';

/** POST /api/ecommerce/analyze 自定义 SSE 事件名 */
export const ANALYZE_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

/** 第五步视觉设计支持的物料类型，同时作为接口合法值。 */
export const ECOMMERCE_DESIGN_TYPES = [
  '主图',
  '详情图',
  '营销海报',
  '手机界面',
  '产品包装',
  '广告牌',
  '展架',
  '橱窗',
  '线下展示空间',
] as const;
