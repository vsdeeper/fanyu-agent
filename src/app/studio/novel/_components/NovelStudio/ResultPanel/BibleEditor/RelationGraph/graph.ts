import {
  Graph,
  type EdgeData,
  type ElementDatum,
  type IElementEvent,
  type NodeData,
} from '@antv/g6';
import type { BibleStepSnapshot, NovelCharacterRole } from '../../../types';
import {
  RELATION_COLOR_FALLBACK,
  RELATION_COLOR_TOKEN,
  RELATION_GRAPH_HEIGHT,
  RELATION_GRAPH_MODAL_WIDTH,
  RELATION_GRAPH_NODE_SIZE,
} from './constants';
import {
  buildRelationGraphData,
  buildRelationNodeTooltip,
  isRelationNodePayload,
  type RelationGraphPalette,
} from './utils';

const TOOLTIP_KEY = 'relation-tooltip';

let palette: RelationGraphPalette = RELATION_COLOR_FALLBACK;

/** 创建只读关系图。拖动节点只影响当前画布，不写回设定。 */
export function createRelationGraph(container: HTMLElement, bible: BibleStepSnapshot): Graph {
  palette = readRelationGraphPalette();
  const graph = new Graph({
    container,
    width: container.clientWidth || RELATION_GRAPH_MODAL_WIDTH,
    height: container.clientHeight || RELATION_GRAPH_HEIGHT,
    autoFit: 'view',
    padding: 48,
    background: palette.surface,
    data: buildRelationGraphData(bible.characters, bible.relations),
    node: {
      type: 'circle',
      style: {
        size: RELATION_GRAPH_NODE_SIZE,
        lineWidth: 0,
        labelPlacement: 'bottom',
        labelFontSize: 13,
        labelOffsetY: 8,
        fill: (datum: NodeData) => palette[roleOf(datum.data)],
        labelFill: () => palette.label,
        labelText: (datum: NodeData) => textOf(datum.data?.name),
      },
    },
    edge: {
      style: {
        stroke: () => palette.edge,
        lineWidth: 1,
        endArrow: true,
        startArrow: (datum: EdgeData) => datum.data?.bidirectional === true,
        labelFontSize: 12,
        labelPlacement: (datum: EdgeData) => labelAtOf(datum.data?.labelAt),
        labelOffsetY: (datum: EdgeData) => labelOffsetOf(datum.style?.curveOffset),
        labelAutoRotate: false,
        labelBackground: true,
        labelBackgroundFill: () => palette.surface,
        labelFill: () => palette.label,
        labelPadding: [2, 6],
        labelText: (datum: EdgeData) => textOf(datum.data?.label),
      },
    },
    layout: {
      type: 'd3-force',
      preventOverlap: true,
      linkDistance: 240,
      nodeStrength: -420,
      collide: { radius: 78, strength: 1 },
      randomSource: seededRandom(1),
    },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    plugins: [
      {
        key: TOOLTIP_KEY,
        type: 'tooltip',
        enable: (event: IElementEvent) => event.targetType === 'node',
        getContent: async (_event: IElementEvent, items: ElementDatum[]) => {
          const data = items[0]?.data;
          if (!isRelationNodePayload(data)) return '';
          return buildRelationNodeTooltip(data);
        },
      },
    ],
  });
  return graph;
}

/** 用最新人物和关系重绘。位置重新计算，不保留拖动结果。 */
export function syncRelationGraph(graph: Graph, bible: BibleStepSnapshot): void {
  palette = readRelationGraphPalette();
  graph.setData(buildRelationGraphData(bible.characters, bible.relations));
  void graph.render();
}

/** 从当前主题令牌取色。Canvas 读不到 CSS 变量，所以在绘制前解析成具体颜色。 */
function readRelationGraphPalette(): RelationGraphPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (token: string, fallback: string) =>
    style.getPropertyValue(token).trim() || fallback;
  return {
    protagonist: read(RELATION_COLOR_TOKEN.protagonist, RELATION_COLOR_FALLBACK.protagonist),
    antagonist: read(RELATION_COLOR_TOKEN.antagonist, RELATION_COLOR_FALLBACK.antagonist),
    supporting: read(RELATION_COLOR_TOKEN.supporting, RELATION_COLOR_FALLBACK.supporting),
    label: read(RELATION_COLOR_TOKEN.label, RELATION_COLOR_FALLBACK.label),
    edge: read(RELATION_COLOR_TOKEN.edge, RELATION_COLOR_FALLBACK.edge),
    surface: read(RELATION_COLOR_TOKEN.surface, RELATION_COLOR_FALLBACK.surface),
  };
}

function roleOf(data: NodeData['data']): NovelCharacterRole {
  const role = data?.role;
  if (role === 'protagonist' || role === 'antagonist' || role === 'supporting') return role;
  return 'supporting';
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function labelAtOf(value: unknown): number {
  return typeof value === 'number' ? value : 0.5;
}

/** 文字离开描边。弯曲的边把字甩到弧外侧，避免字压在线上。 */
function labelOffsetOf(curveOffset: unknown): number {
  if (typeof curveOffset === 'number' && curveOffset !== 0) return Math.sign(curveOffset) * 18;
  return -18;
}

/** 固定力导向的随机序列，同一份关系每次打开落在相同位置。 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
