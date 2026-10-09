import type { RelationGraphPalette } from './utils';

export const RELATION_GRAPH_MODAL_WIDTH = 1200;
export const RELATION_GRAPH_HEIGHT = 700;
export const RELATION_GRAPH_NODE_SIZE = 36;
/** 同一对人物的相邻边错开距离。两条反向边用完整间距，避免缩成一条线。 */
export const RELATION_CURVE_STEP = 72;
/** 关系名靠近度数更低的一端。0 是起点，1 是终点。 */
export const RELATION_LABEL_NEAR_LEAF = 0.32;

export const RELATION_COLOR_TOKEN = {
  protagonist: '--fanyu-color-primary',
  antagonist: '--fanyu-color-error',
  supporting: '--fanyu-color-text-secondary',
  label: '--fanyu-color-text',
  edge: '--fanyu-color-border',
  surface: '--fanyu-color-bg-elevated',
} as const;

export const RELATION_COLOR_FALLBACK: RelationGraphPalette = {
  protagonist: '#1677ff',
  antagonist: '#ff4d4f',
  supporting: '#8c8c8c',
  label: '#141414',
  edge: '#d9d9d9',
  surface: '#ffffff',
};
