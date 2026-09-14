import type { MessagePart } from '../utils';
import {
  EDIT_IMAGE_LABEL,
  FIELD_LABELS,
  PENDING_TITLE_SUFFIX,
  TOOL_LABELS,
  VALUE_LABELS,
  VALUE_MAX_CHARS,
} from './constants';

export type ToolCallStatus = 'pending' | 'done' | 'failed';

/** 展开后的一行入参 */
export type ToolInputRow = { key: string; label: string; value: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `tool-generate_image` → `generate_image`；非工具 part 返回空串 */
export function getToolName(part: MessagePart): string {
  return part.type.startsWith('tool-') ? part.type.slice('tool-'.length) : '';
}

/** 工具入参对象；未开始传参或形状异常时返回空对象 */
function getToolInput(part: MessagePart): Record<string, unknown> {
  return isRecord(part.input) ? part.input : {};
}

/**
 * 工具调用状态：
 * - output-error，或 output.ok === false（服务端把中断/失败收尾成 `{ ok: false, error }`）→ failed
 * - output-available → done
 * - 其余（input-streaming / input-available 等）→ pending，仍在传参或执行
 */
export function getToolStatus(part: MessagePart): ToolCallStatus {
  if (part.state === 'output-error') return 'failed';

  const output = part.output;
  if (isRecord(output) && output.ok === false) return 'failed';

  return part.state === 'output-available' ? 'done' : 'pending';
}

/** 失败原因：优先取 output.error，其次取 SDK 的 errorText；无则返回空串 */
export function getToolError(part: MessagePart): string {
  const output = part.output;
  if (isRecord(output) && typeof output.error === 'string') return output.error;
  return typeof part.errorText === 'string' ? part.errorText : '';
}

/**
 * 折叠行文案：只给工具中文名（edit 模式的生图叫「改图」），未知工具回落到工具名原文。
 * 具体入参不进标题——展开后逐行可见，标题保持和思考块一样短。
 */
export function getToolTitle(part: MessagePart): string {
  const name = getToolName(part);
  if (name === 'generate_image' && getToolInput(part).mode === 'edit') return EDIT_IMAGE_LABEL;
  return TOOL_LABELS[name] ?? name;
}

/** 工具调用进行中时标题追加的省略号（与 Thinking 块的加载态呼应） */
export function getPendingTitle(title: string): string {
  return `${title}${PENDING_TITLE_SUFFIX}`;
}

/** 展开后的全量入参：按模型传参顺序逐行列出，空值字段跳过 */
export function getToolInputRows(part: MessagePart): ToolInputRow[] {
  const rows = toInputRows(getToolInput(part));

  // 原生联网由 provider 自己执行，query / url 不在 input 而在 output.action
  return rows.length > 0 ? rows : toSearchActionRows(part);
}

function toInputRows(input: Record<string, unknown>): ToolInputRow[] {
  return Object.entries(input)
    .filter(([, value]) => !isEmptyValue(value))
    .map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      value: truncateValue(formatFieldValue(key, value)),
    }));
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

/** 值按类型归一化：枚举查中文名、数组顿号连接、对象保留 JSON、布尔转是/否 */
function formatFieldValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    if (key === 'pastedImageIndexes') {
      const indexes = formatImageIndexes(value);
      if (indexes) return indexes;
    }
    return value.map((item) => (isRecord(item) ? JSON.stringify(item) : String(item))).join('、');
  }
  if (isRecord(value)) return JSON.stringify(value, null, 2);

  const label = VALUE_LABELS[key]?.[String(value)];
  if (label) return label;
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

/** 0 基粘贴图序号 → 「第 1、2 张」 */
function formatImageIndexes(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const numbers = value.filter((item): item is number => typeof item === 'number');
  if (numbers.length !== value.length || numbers.length === 0) return '';
  return `第 ${numbers.map((item) => item + 1).join('、')} 张`;
}

/** 原生联网的 output.action：search 带 queries，openPage 带 url */
type SearchAction = { type: string; queries: string[]; url: string };

function getSearchAction(part: MessagePart): SearchAction | null {
  const output = part.output;
  if (!isRecord(output) || !isRecord(output.action)) return null;

  const action = output.action;
  return {
    type: typeof action.type === 'string' ? action.type : '',
    queries: Array.isArray(action.queries) ? cleanQueries(action.queries) : [],
    url: typeof action.url === 'string' ? action.url : '',
  };
}

/** 上游会在 queries 里混入 `ws_call_id=xxx` 标记，展示时剔除 */
function cleanQueries(queries: unknown[]): string[] {
  return queries.filter(
    (query): query is string =>
      typeof query === 'string' && !!query && !query.startsWith('ws_call_id='),
  );
}

function toSearchActionRows(part: MessagePart): ToolInputRow[] {
  const action = getSearchAction(part);
  if (!action) return [];

  const rows: ToolInputRow[] = [];
  if (action.queries.length > 0) {
    rows.push({ key: 'queries', label: FIELD_LABELS.queries, value: action.queries.join('、') });
  }
  if (action.url) {
    rows.push({ key: 'url', label: FIELD_LABELS.url, value: action.url });
  }
  return rows;
}

function truncateValue(value: string): string {
  return value.length > VALUE_MAX_CHARS ? `${value.slice(0, VALUE_MAX_CHARS)}…` : value;
}
