import type { CSSProperties } from 'react';

/** 与 antd Button `icon` / MODE_ICON 对齐的外观入参 */
export type CustomIconStyleProps = {
  style?: CSSProperties;
  className?: string;
};

/** 一份 SVG 图标的几何定义，新增图标只需补 viewBox + paths */
export type SvgIconDefinition = {
  viewBox: string;
  paths: readonly string[];
};
