/** 工作台历史上曾写入 chats 的 id 前缀；listChats 据此从侧栏排除遗留行 */
export const ECOM_CHAT_ID_PREFIX = 'ecom-';

/** POST /api/ecommerce/analyze 自定义 SSE 事件名 */
export const ANALYZE_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

export const DEFAULT_MODEL_REQUIREMENT =
  '上传了模特形象就以模特形象为参考标准；否则根据产品品类与主视觉调性自动匹配模特性别、年龄和气质。默认中国模特，妆发自然干净，造型简洁高级且不抢产品；四格保持同一模特、同一造型。可穿戴品须正确穿戴并清晰展示，非可穿戴品不得出现、手持或操作产品。';

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
