import type { CSSProperties } from 'react';

/** 与就绪卡片视觉尺寸对齐的加载骨架 */
export const FILE_CARD_SKELETON_STYLE: CSSProperties = {
  width: 240,
  height: 52,
  borderRadius: 8,
};

/** 文件大小单位（1024 进制） */
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;
