import { WECHAT_ARTICLE_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/wechat-article/_shared/task-constants';
import type {
  WechatArticleStepKey,
  WechatArticleTaskStepRecord,
} from '@/app/api/studio/wechat-article/_shared/task-types';
import { apiPut } from '@/lib/shared/client/api-client';
import type {
  AngleCard,
  DraftStepSnapshot,
  ImageSlot,
  PlanStepSnapshot,
  ResearchSource,
  ResearchStepSnapshot,
  StudioPhase,
} from './types';
import { DEFAULT_IMAGE_ASPECT, DEFAULT_IMAGE_CLARITY, DEFAULT_IMAGE_MODEL } from './constants';

export { assertOkOrJsonFail, isAbortError } from '@/app/studio/_utils/generate-stream';
export { createRafTextBuffer, consumeAnalyzeSse } from '@/app/studio/_utils/analyze-stream';
export {
  applyGenerateEvent,
  consumeGenerateNdjson,
  pendingImages,
} from '@/app/studio/_utils/generate-stream';

/**
 * 流式展示用：去掉末尾 ```json 围栏（含尚未闭合的），避免把 sources/angles 原文刷出来。
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

/** 模型常把工具预告写成正文首句（中英皆有） */
const SEARCH_PREAMBLE_SENTENCE =
  /^(?:I(?:['’]ll|\s+will|\s+am\s+going\s+to)\s+search\b|Let\s+me\s+(?:search|look\s+up)\b|Searching\s+for\b|我先(?:联网)?(?:检索|搜索|搜)|让我(?:先)?(?:联网)?(?:检索|搜索|搜)|接下来(?:我)?(?:会|将)(?:联网)?(?:检索|搜索))[^\n。.!！]*[。.!?！]?\s*/i;

/**
 * 去掉「检索简报」标题，以及调用搜索前的口头预告，避免糊在简报开头。
 */
export function cleanResearchBrief(text: string): string {
  let remaining = stripTrailingJsonFenceForDisplay(text).replace(/#{1,6}\s*检索简报\s*/g, '\n');
  for (let i = 0; i < 4; i += 1) {
    const next = remaining.replace(SEARCH_PREAMBLE_SENTENCE, '').trimStart();
    if (next === remaining) break;
    remaining = next;
  }
  return remaining.trim();
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
  // 漏写结尾围栏时仍切开，避免正文残留 JSON 原文
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

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/** 粗判是否为可用 http(s) 链接。 */
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 解析调研 JSON 为参考来源与角度卡；无 url 的来源条目丢弃。 */
export function parseResearchPayload(json: unknown): {
  sources: ResearchSource[];
  angles: AngleCard[];
} {
  if (!json || typeof json !== 'object') return { sources: [], angles: [] };
  const record = json as Record<string, unknown>;
  const sources: ResearchSource[] = [];
  if (Array.isArray(record.sources)) {
    for (const item of record.sources) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const title = asString(row.title);
      const blurb = asString(row.blurb);
      const url = asString(row.url);
      const publishedAt = asString(row.publishedAt);
      const kind = row.kind;
      if (!title || !blurb || !url || !isHttpUrl(url)) continue;
      if (kind !== 'fact' && kind !== 'view' && kind !== 'case') continue;
      sources.push({
        title,
        blurb,
        url,
        kind,
        ...(publishedAt ? { publishedAt } : {}),
      });
    }
  }
  const angles: AngleCard[] = [];
  if (Array.isArray(record.angles)) {
    for (const item of record.angles) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = asString(row.id);
      const claim = asString(row.claim);
      const conflict = asString(row.conflict);
      const whyNow = asString(row.whyNow);
      if (!id || !claim || !conflict || !whyNow) continue;
      angles.push({
        id,
        claim,
        conflict,
        whyNow,
        ...(asString(row.risk) ? { risk: asString(row.risk) } : {}),
      });
    }
  }
  return { sources, angles };
}

/** 解析思路 JSON。 */
export function parsePlanPayload(json: unknown): PlanStepSnapshot | null {
  if (!json || typeof json !== 'object') return null;
  const record = json as Record<string, unknown>;
  const beats = asStringArray(record.beats);
  if (!beats?.length) return null;
  const titleDirections = asStringArray(record.titleDirections);
  return {
    beats,
    ...(asString(record.tone) ? { tone: asString(record.tone) } : {}),
    ...(asString(record.audience) ? { audience: asString(record.audience) } : {}),
    ...(titleDirections
      ? { titleDirections, selectedTitleIndex: 0 }
      : {}),
  };
}

/** 取出内容思路中已选定的成稿标题。 */
export function resolvePlanTitle(plan: PlanStepSnapshot): string | undefined {
  const list = plan.titleDirections;
  if (!list?.length) return undefined;
  const index =
    typeof plan.selectedTitleIndex === 'number' &&
    plan.selectedTitleIndex >= 0 &&
    plan.selectedTitleIndex < list.length
      ? plan.selectedTitleIndex
      : 0;
  const title = list[index]?.trim();
  return title || undefined;
}

/** 解析成稿末尾元数据（标题与配图槽）。 */
export function parseDraftMeta(json: unknown): {
  titles?: string[];
  imageSlots: ImageSlot[];
} {
  if (!json || typeof json !== 'object') return { imageSlots: [] };
  const record = json as Record<string, unknown>;
  const titles = asStringArray(record.titles);
  const imageSlots: ImageSlot[] = [];
  if (Array.isArray(record.imageSlots)) {
    for (const item of record.imageSlots) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = asString(row.id);
      const promptDraft = asString(row.promptDraft);
      const role = row.role === 'cover' || row.role === 'inline' ? row.role : 'inline';
      if (!id || !promptDraft) continue;
      imageSlots.push({
        id,
        role,
        promptDraft,
        ...(asString(row.assetUrl) ? { assetUrl: asString(row.assetUrl) } : {}),
      });
    }
  }
  return {
    ...(titles ? { titles } : {}),
    imageSlots,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** 读取调研步快照。 */
export function readResearchStepSnapshot(data: unknown): ResearchStepSnapshot | undefined {
  if (!isRecord(data)) return undefined;
  const idea = asString(data.idea) ?? '';
  const sources = Array.isArray(data.sources)
    ? parseResearchPayload({ sources: data.sources, angles: [] }).sources
    : [];
  const angles = Array.isArray(data.angles)
    ? parseResearchPayload({ sources: [], angles: data.angles }).angles
    : [];
  // 旧快照把观点写在 stance；新字段为 viewpoint，读取时兼容旧键。
  const viewpoint = asString(data.viewpoint) || asString(data.stance);
  return {
    idea,
    sources,
    angles,
    ...(viewpoint ? { viewpoint } : {}),
    ...(asString(data.streamText) ? { streamText: asString(data.streamText) } : {}),
    ...(asString(data.selectedAngleId) ? { selectedAngleId: asString(data.selectedAngleId) } : {}),
  };
}

/** 读取思路步快照。 */
export function readPlanStepSnapshot(data: unknown): PlanStepSnapshot | undefined {
  if (!isRecord(data)) return undefined;
  const beats = asStringArray(data.beats);
  if (!beats?.length) {
    const parsed = parsePlanPayload(data);
    return parsed ?? undefined;
  }
  const titleDirections = asStringArray(data.titleDirections);
  const selectedFromData =
    typeof data.selectedTitleIndex === 'number' &&
    Number.isInteger(data.selectedTitleIndex) &&
    data.selectedTitleIndex >= 0
      ? data.selectedTitleIndex
      : undefined;
  const selectedTitleIndex =
    titleDirections && selectedFromData !== undefined && selectedFromData < titleDirections.length
      ? selectedFromData
      : titleDirections
        ? 0
        : undefined;
  return {
    beats,
    ...(asString(data.tone) ? { tone: asString(data.tone) } : {}),
    ...(asString(data.audience) ? { audience: asString(data.audience) } : {}),
    ...(titleDirections ? { titleDirections } : {}),
    ...(selectedTitleIndex !== undefined ? { selectedTitleIndex } : {}),
    ...(asString(data.streamText) ? { streamText: asString(data.streamText) } : {}),
  };
}

/** 读取成稿步快照。 */
export function readDraftStepSnapshot(data: unknown): DraftStepSnapshot | undefined {
  if (!isRecord(data)) return undefined;
  const markdown = typeof data.markdown === 'string' ? data.markdown : '';
  const meta = parseDraftMeta({
    titles: data.titles,
    imageSlots: data.imageSlots,
  });
  return {
    markdown,
    imageSlots: meta.imageSlots,
    ...(meta.titles ? { titles: meta.titles } : {}),
    ...(asStringArray(data.styleSamples) ? { styleSamples: asStringArray(data.styleSamples) } : {}),
    ...(asString(data.tone) ? { tone: asString(data.tone) } : {}),
    ...(typeof data.deAiFlavor === 'boolean' ? { deAiFlavor: data.deAiFlavor } : {}),
    ...(asString(data.imageModel) ? { imageModel: asString(data.imageModel) } : {}),
    ...(asString(data.imageAspectRatio)
      ? { imageAspectRatio: asString(data.imageAspectRatio) }
      : {}),
    ...(asString(data.imageClarity) ? { imageClarity: asString(data.imageClarity) } : {}),
    ...(asString(data.streamText) ? { streamText: asString(data.streamText) } : {}),
  };
}

/** 首次进入/刷新默认停在第一步选题调研；有角度卡则进入 researched 结果态。 */
export function resolveInitialPhase(research?: ResearchStepSnapshot): StudioPhase {
  if (research?.angles.length) return 'researched';
  return 'research';
}

/** 比较调研快照是否等价。 */
export function isSameResearchSnapshot(
  a: ResearchStepSnapshot | undefined,
  b: ResearchStepSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 比较思路快照是否等价。 */
export function isSamePlanSnapshot(
  a: PlanStepSnapshot | undefined,
  b: PlanStepSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 比较成稿快照是否等价。 */
export function isSameDraftSnapshot(
  a: DraftStepSnapshot | undefined,
  b: DraftStepSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 落盘公众号步骤快照，返回服务端资产 URL 化后的 data。 */
export async function saveWechatStep<T>(
  taskId: string,
  stepKey: WechatArticleStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<WechatArticleTaskStepRecord>(
    `/api/studio/wechat-article/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: WECHAT_ARTICLE_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 将风格样本文本拆成最多 3 段。 */
export function splitStyleSamples(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** 组装风格样本文本框内容。 */
export function joinStyleSamples(samples: string[] | undefined): string {
  return (samples ?? []).join('\n\n');
}

/** 默认成稿生图规格。 */
export function defaultImageSpec() {
  return {
    imageModel: DEFAULT_IMAGE_MODEL,
    imageAspectRatio: DEFAULT_IMAGE_ASPECT,
    imageClarity: DEFAULT_IMAGE_CLARITY,
  };
}

/** 复制纯文本到剪贴板。 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** 将图片 URL 复制为 image/png。 */
export async function copyImageFromUrl(url: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('fetch image failed');
  const blob = await response.blob();
  const pngBlob =
    blob.type === 'image/png' ? blob : new Blob([await blob.arrayBuffer()], { type: 'image/png' });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

/** 构建一键复制的正文（含可选标题）。 */
export function buildCopyArticleText(titles: string[] | undefined, markdown: string): string {
  const title = titles?.[0]?.trim();
  if (title) return `${title}\n\n${markdown}`.trim();
  return markdown.trim();
}
