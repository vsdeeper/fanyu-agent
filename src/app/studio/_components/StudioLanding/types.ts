import type { ComponentType } from 'react';

/** 工作室落地页卡片条目：功能入口的标题、说明、跳转路径与图标组件。 */
export type StudioEntry = {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: ComponentType;
};
