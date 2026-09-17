import { STYLE_TUNING_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/style-tuning/_shared/task-constants';
import type {
  StyleTuningPublishScene,
  StyleTuningSoftParams,
} from '@/app/api/studio/style-tuning/_shared/types';
import type {
  StyleTuningStepKey,
  StyleTuningTaskStepRecord,
} from '@/app/api/studio/style-tuning/_shared/task-types';
import { STYLE_TUNING_PUBLISH_SCENES } from '@/app/api/studio/style-tuning/_shared/constants';
import { apiPut } from '@/lib/shared/client/api-client';
import { EMPTY_SOFT_PARAMS } from './constants';
import type { SoftTuneStepSnapshot, StudioPhase, TrialWriteStepSnapshot } from './types';

export { assertOkOrJsonFail, isAbortError } from '@/app/studio/_utils/generate-stream';
export { createRafTextBuffer, consumeAnalyzeSse } from '@/app/studio/_utils/analyze-stream';

/**
 * 流式展示用：去掉末尾 ```json 围栏（含尚未闭合的）。
 */
export function stripTrailingJsonFenceForDisplay(text: string): string {
  const complete = text.match(/```json\s*[\s\S]*?```\s*$/i);
  if (complete?.index != null) {
    return text.slice(0, complete.index).trimEnd();
  }
  const open = /```json\b/i.exec(text);
  if (open?.index != null) {
    return text.slice(0, open.index).trimEnd();
  }
  return text;
}

/** 从模型回复中拆出末尾 JSON 代码块。 */
export function extractTrailingJsonBlock(text: string): {
  prose: string;
  json: unknown | null;
} {
  const match = text.match(/```json\s*([\s\S]*?)```\s*$/i);
  if (match?.index != null) {
    const prose = text.slice(0, match.index).trim();
    try {
      return { prose, json: JSON.parse(match[1]!) as unknown };
    } catch {
      return { prose, json: null };
    }
  }
  const open = /```json\b/i.exec(text);
  if (open?.index != null) {
    const prose = text.slice(0, open.index).trim();
    const raw = text
      .slice(open.index + open[0].length)
      .replace(/```\s*$/, '')
      .trim();
    try {
      return { prose, json: JSON.parse(raw) as unknown };
    } catch {
      return { prose, json: null };
    }
  }
  return { prose: text.trim(), json: null };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPublishScene(value: unknown): value is StyleTuningPublishScene {
  return (
    typeof value === 'string' && (STYLE_TUNING_PUBLISH_SCENES as readonly string[]).includes(value)
  );
}

/** 解析软调 JSON 为六维参数；字段不全则返回 null。 */
export function parseSoftParams(json: unknown): StyleTuningSoftParams | null {
  if (!isRecord(json)) return null;
  const rolePersona = asString(json.rolePersona);
  const viewpointNarration = asString(json.viewpointNarration);
  const languageTexture = asString(json.languageTexture);
  const rhythmStructure = asString(json.rhythmStructure);
  const emotionTemperature = asString(json.emotionTemperature);
  const goalsConstraints = asString(json.goalsConstraints);
  if (
    !rolePersona ||
    !viewpointNarration ||
    !languageTexture ||
    !rhythmStructure ||
    !emotionTemperature ||
    !goalsConstraints
  ) {
    return null;
  }
  return {
    rolePersona,
    viewpointNarration,
    languageTexture,
    rhythmStructure,
    emotionTemperature,
    goalsConstraints,
  };
}

/** 六维是否均已填写。 */
const SOFT_PARAM_FIELDS_KEYS: Array<keyof StyleTuningSoftParams> = [
  'rolePersona',
  'viewpointNarration',
  'languageTexture',
  'rhythmStructure',
  'emotionTemperature',
  'goalsConstraints',
];

export function hasCompleteSoftParams(params: StyleTuningSoftParams | undefined): boolean {
  if (!params) return false;
  return SOFT_PARAM_FIELDS_KEYS.every((key) => Boolean(params[key]?.trim()));
}

/** 将六维参数拼成与流式输出一致的 Markdown 正文（无 JSON 尾）。 */
export function formatSoftParamsAsMarkdown(params: StyleTuningSoftParams): string {
  return [
    ['## 1. 角色与人格', params.rolePersona],
    ['## 2. 视角与人称', params.viewpointNarration],
    ['## 3. 语言质感', params.languageTexture],
    ['## 4. 节奏与结构', params.rhythmStructure],
    ['## 5. 情绪温度', params.emotionTemperature],
    ['## 6. 目标与约束', params.goalsConstraints],
  ]
    .map(([heading, body]) => `${heading}\n\n${(body ?? '').trim()}`)
    .join('\n\n')
    .trim();
}

/** 读取软调步快照（兼容旧键 metaPrompt）。 */
export function readSoftTuneStepSnapshot(data: unknown): SoftTuneStepSnapshot | undefined {
  if (!isRecord(data)) return undefined;
  if (!isPublishScene(data.publishScene)) return undefined;
  const stylePrompt =
    typeof data.stylePrompt === 'string'
      ? data.stylePrompt
      : typeof data.metaPrompt === 'string'
        ? data.metaPrompt
        : '';
  const topicContent = typeof data.topicContent === 'string' ? data.topicContent : '';
  const softParams = parseSoftParams(data.softParams) ?? undefined;
  return {
    publishScene: data.publishScene,
    topicContent,
    stylePrompt,
    ...(softParams ? { softParams } : {}),
    ...(asString(data.streamText) ? { streamText: asString(data.streamText) } : {}),
  };
}

/** 读取试写步快照（兼容旧键 requirement）。 */
export function readTrialWriteStepSnapshot(data: unknown): TrialWriteStepSnapshot | undefined {
  if (!isRecord(data)) return undefined;
  const contentOutlineRaw =
    typeof data.contentOutline === 'string'
      ? data.contentOutline
      : typeof data.requirement === 'string'
        ? data.requirement
        : '';
  const contentOutline = contentOutlineRaw.trim() ? contentOutlineRaw : undefined;
  const markdown = typeof data.markdown === 'string' ? data.markdown : '';
  return {
    ...(contentOutline ? { contentOutline } : {}),
    markdown,
    ...(asString(data.streamText) ? { streamText: asString(data.streamText) } : {}),
  };
}

/** 首次进入/刷新默认停在第一步软调；有完整六维则进入 softtuned 结果态。 */
export function resolveInitialPhase(softtune?: SoftTuneStepSnapshot): StudioPhase {
  if (hasCompleteSoftParams(softtune?.softParams)) return 'softtuned';
  return 'softtune';
}

/** 比较软调快照是否等价。 */
export function isSameSoftTuneSnapshot(
  a: SoftTuneStepSnapshot | undefined,
  b: SoftTuneStepSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 比较试写快照是否等价。 */
export function isSameTrialWriteSnapshot(
  a: TrialWriteStepSnapshot | undefined,
  b: TrialWriteStepSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 落盘文风调步骤快照，返回服务端 data。 */
export async function saveStyleTuningStep<T>(
  taskId: string,
  stepKey: StyleTuningStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<StyleTuningTaskStepRecord>(
    `/api/studio/style-tuning/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: STYLE_TUNING_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 统计正文「字数」：去掉空白后的字符数。 */
export function countTextChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/** 空六维参数副本。 */
export function createEmptySoftParams(): StyleTuningSoftParams {
  return { ...EMPTY_SOFT_PARAMS };
}
