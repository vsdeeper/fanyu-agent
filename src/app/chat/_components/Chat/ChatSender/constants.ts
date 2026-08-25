import type { SlotConfigType } from '@ant-design/x/es/sender/interface';

/** 稳定空数组，避免 inline [] 触发 SlotTextArea 的 slotConfig effect 重建 DOM */
export const EMPTY_SLOT_CONFIG: Readonly<SlotConfigType[]> = [];

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** 选择器只放行后端可解析类型：.doc 无可靠解析、方舟仅接受 application/pdf 内联 */
export const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx';
