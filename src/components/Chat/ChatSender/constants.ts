import type { SlotConfigType } from '@ant-design/x/es/sender/interface';

/** 稳定空数组，避免 inline [] 触发 SlotTextArea 的 slotConfig effect 重建 DOM */
export const EMPTY_SLOT_CONFIG: Readonly<SlotConfigType[]> = [];
