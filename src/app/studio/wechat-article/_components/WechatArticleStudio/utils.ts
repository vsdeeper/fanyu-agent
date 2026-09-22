import { WECHAT_ARTICLE_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/wechat-article/_shared/task-constants';
import type {
  WechatArticleStepKey,
  WechatArticleTaskStepRecord,
} from '@/app/api/studio/wechat-article/_shared/task-types';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload';
import { parseStyleSelections } from '@/business-components/StyleDimensionPicker';
import { apiPut } from '@/lib/shared/client/api-client';
import type {
  AngleCard,
  DraftStepSnapshot,
  ImageHistoryItem,
  ImageSlot,
  PlanStepSnapshot,
  ResearchSource,
  ResearchStepSnapshot,
  StudioPhase,
} from './types';
import {
  DEFAULT_IMAGE_ASPECT,
  DEFAULT_IMAGE_CLARITY,
  DEFAULT_IMAGE_MODEL,
  IMAGE_ASPECT_RATIO_OPTIONS,
  IMAGE_MARKER_LINE_RE,
  LENGTH_LIMIT_MAX,
  LENGTH_LIMIT_MIN,
  MIN_TITLE_DIRECTIONS,
  WATERMARK_BACKDROP_ALPHA_CUTOFF,
  WATERMARK_BACKDROP_TOLERANCE,
  WATERMARK_BOTTOM_RATIO,
  WATERMARK_BRIGHT_PIXEL_LUMINANCE,
  WATERMARK_INK_ALPHA_MIN,
  WATERMARK_INK_ON_DARK,
  WATERMARK_INK_ON_LIGHT,
  WATERMARK_JPEG_QUALITY,
  WATERMARK_LIGHT_BACKDROP_LUMINANCE,
  WATERMARK_MIN_INK_DISTANCE,
  WATERMARK_OPACITY,
  WATERMARK_RIGHT_RATIO,
  WATERMARK_TRANSPARENT_ALPHA_MAX,
  WATERMARK_WIDTH_RATIO,
} from './constants';
import { resolveClarityForModel } from '@/app/studio/_utils/model-options';

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
  // 模型有时漏写 json 语言标：末尾普通 ``` ... ```
  const bare = text.match(/```\s*([\s\S]*?)```\s*$/);
  if (bare?.index != null) {
    const inner = bare[1]!.trim();
    if (inner.startsWith('{')) {
      try {
        return { prose: text.slice(0, bare.index).trim(), json: JSON.parse(inner) as unknown };
      } catch {
        /* 继续尝试无围栏 */
      }
    }
  }
  // 无围栏时：从最后一个含 angles 的 { 尝试解析
  const anglesAt = text.lastIndexOf('"angles"');
  if (anglesAt >= 0) {
    const brace = text.lastIndexOf('{', anglesAt);
    if (brace >= 0) {
      const raw = text.slice(brace).trim();
      try {
        const json = JSON.parse(raw) as unknown;
        if (json && typeof json === 'object' && Array.isArray((json as { angles?: unknown }).angles)) {
          return { prose: text.slice(0, brace).trim(), json };
        }
      } catch {
        /* 保持全文为 prose */
      }
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
  if (!titleDirections || titleDirections.length < MIN_TITLE_DIRECTIONS) return null;
  return {
    beats,
    ...(asString(record.audience) ? { audience: asString(record.audience) } : {}),
    titleDirections,
    selectedTitleIndex: 0,
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

/** 解析配图规划 JSON 中的整套视觉约束。 */
export function parseImageVisualStyle(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const style = asString((json as Record<string, unknown>).visualStyle)?.trim();
  return style || undefined;
}

/** 解析配图规划 / 成稿末尾元数据中的槽位。 */
export function parseImageSlots(json: unknown): ImageSlot[] {
  if (!json || typeof json !== 'object') return [];
  const record = json as Record<string, unknown>;
  const imageSlots: ImageSlot[] = [];
  const usedIds = new Set<string>();
  if (!Array.isArray(record.imageSlots)) return imageSlots;
  for (const item of record.imageSlots) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    let id = asString(row.id);
    const promptDraft = asString(row.promptDraft) ?? '';
    const role = row.role === 'cover' || row.role === 'inline' ? row.role : 'inline';
    const label =
      asString(row.label) ?? (role === 'cover' ? '封面' : id ? `插图-${id}` : undefined);
    if (!id || !label) continue;
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    usedIds.add(id);
    const aspectRatio = asString(row.aspectRatio)?.trim();
    const model = asString(row.model)?.trim() || DEFAULT_IMAGE_MODEL;
    const clarityRaw = asString(row.clarity)?.trim() || DEFAULT_IMAGE_CLARITY;
    imageSlots.push({
      id,
      label,
      role,
      promptDraft,
      aspectRatio:
        aspectRatio && IMAGE_ASPECT_RATIO_OPTIONS.some((opt) => opt.value === aspectRatio)
          ? aspectRatio
          : DEFAULT_IMAGE_ASPECT,
      model,
      clarity: resolveClarityForModel(model, clarityRaw),
      ...(asString(row.assetUrl) ? { assetUrl: asString(row.assetUrl) } : {}),
    });
  }
  return imageSlots;
}

/** 解析成稿末尾元数据（兼容旧流里的 titles / imageSlots）。 */
export function parseDraftMeta(json: unknown): {
  titles?: string[];
  imageSlots: ImageSlot[];
} {
  if (!json || typeof json !== 'object') return { imageSlots: [] };
  const record = json as Record<string, unknown>;
  const titles = asStringArray(record.titles);
  return {
    ...(titles ? { titles } : {}),
    imageSlots: parseImageSlots(json),
  };
}

/** 从槽位移入历史：仅保留有图项，按 assetUrl 去重追加；历史项 id 须唯一（勿复用 slot.id）。 */
export function mergeSlotsIntoHistory(
  history: ImageHistoryItem[],
  slots: ImageSlot[],
): ImageHistoryItem[] {
  const next = [...history];
  const seenUrls = new Set(next.map((item) => item.assetUrl));
  const seenIds = new Set(next.map((item) => item.id));
  for (const slot of slots) {
    const url = slot.assetUrl?.trim();
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    let id = `hist-${slot.id}-${next.length}`;
    let n = 0;
    while (seenIds.has(id)) {
      n += 1;
      id = `hist-${slot.id}-${next.length}-${n}`;
    }
    seenIds.add(id);
    next.push({
      id,
      assetUrl: url,
      label: slot.label,
      ...(slot.promptDraft.trim() ? { promptDraft: slot.promptDraft } : {}),
    });
  }
  return next;
}

/** 去掉正文中的配图标注行（复制发布用）。 */
export function stripImageMarkers(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !IMAGE_MARKER_LINE_RE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 读取历史配图列表（仅有图）；校正旧数据中复用 slot.id 导致的重复 id。 */
export function parseImageHistory(value: unknown): ImageHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const items: ImageHistoryItem[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const assetUrl = asString(row.assetUrl);
    const rawId = asString(row.id) ?? assetUrl;
    if (!assetUrl || !rawId || seenUrls.has(assetUrl)) continue;
    seenUrls.add(assetUrl);
    let id = rawId;
    let n = 0;
    while (seenIds.has(id)) {
      n += 1;
      id = `${rawId}-${n}`;
    }
    seenIds.add(id);
    items.push({
      id,
      assetUrl,
      ...(asString(row.label) ? { label: asString(row.label) } : {}),
      ...(asString(row.promptDraft) ? { promptDraft: asString(row.promptDraft) } : {}),
    });
  }
  return items;
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
  const experience = asString(data.experience);
  // 旧快照把观点写在 stance；新字段为 viewpoint，读取时兼容旧键。
  const viewpoint = asString(data.viewpoint) || asString(data.stance);
  return {
    idea,
    sources,
    angles,
    ...(experience ? { experience } : {}),
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
  const styleSelections = parseStyleSelections(data.styleSelections);
  const lengthLimit =
    typeof data.lengthLimit === 'number' &&
    Number.isInteger(data.lengthLimit) &&
    data.lengthLimit >= LENGTH_LIMIT_MIN &&
    data.lengthLimit <= LENGTH_LIMIT_MAX
      ? data.lengthLimit
      : undefined;
  const imageHistory = parseImageHistory(data.imageHistory);
  return {
    markdown,
    imageSlots: meta.imageSlots,
    ...(imageHistory.length ? { imageHistory } : {}),
    ...(asString(data.imageVisualStyle)?.trim()
      ? { imageVisualStyle: asString(data.imageVisualStyle)!.trim() }
      : {}),
    ...(asString(data.styleReferenceUrl)?.trim()
      ? { styleReferenceUrl: asString(data.styleReferenceUrl)!.trim() }
      : {}),
    ...(asString(data.watermarkUrl)?.trim()
      ? { watermarkUrl: asString(data.watermarkUrl)!.trim() }
      : {}),
    ...(meta.titles ? { titles: meta.titles } : {}),
    ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
    ...(lengthLimit !== undefined ? { lengthLimit } : {}),
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

/** 默认成稿生图规格。 */
export function defaultImageSpec() {
  return {
    imageModel: DEFAULT_IMAGE_MODEL,
    imageAspectRatio: DEFAULT_IMAGE_ASPECT,
    imageClarity: DEFAULT_IMAGE_CLARITY,
  };
}

/** 统计正文「字数」：去掉空白后的字符数。 */
export function countTextChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/** 复制纯文本到剪贴板。 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * 复制富文本（公众号后台认 text/html + 内联 style）。
 * Safari 对 ClipboardItem 值要求 Promise 包装的 Blob，故统一用 Promise.resolve。
 * 富文本写入失败时降级为纯文本。
 */
export async function copyRichText(payload: { html: string; plain: string }): Promise<void> {
  const { html, plain } = payload;
  if (!html.trim() && !plain.trim()) {
    throw new Error('empty copy payload');
  }
  try {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const plainBlob = new Blob([plain || html], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': Promise.resolve(htmlBlob),
        'text/plain': Promise.resolve(plainBlob),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(plain || html);
  }
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

/** 把本地或远程图片 URL 读成 data URL（规划配图多模态入参用）。 */
export async function resolveImageDataUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  const response = await fetch(trimmed);
  if (!response.ok) throw new Error('fetch image failed');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('read image failed'));
    };
    reader.onerror = () => reject(new Error('read image failed'));
    reader.readAsDataURL(blob);
  });
}

/** 把图片 URL 载入为可绘制元素。 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = src;
  });
}

/** 像素是否落在 [0,255]。 */
function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** 取某个像素到给定底色的 RGB 欧氏距离。 */
function distanceToBackground(pixels: Uint8ClampedArray, offset: number, background: number[]) {
  return Math.hypot(
    pixels[offset]! - background[0]!,
    pixels[offset + 1]! - background[1]!,
    pixels[offset + 2]! - background[2]!,
  );
}

/** 取四角像素的 RGBA：底色判定只认这四个点，它们才是「背景」的代表。 */
function cornerPixels(pixels: Uint8ClampedArray, width: number, height: number): number[][] {
  return [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4].map(
    (offset) => [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!],
  );
}

/**
 * 由四角决定这块背景能不能抠，返回底色：
 * - 四角都透明 → 图本身就是透明底（用户已抠好），返回 null 表示原样使用；
 * - 四角同色（纯色卡片）或四角都亮（棋盘格「伪透明」导出、浅色渐变卡）→ 返回四角平均色；
 * - 其余（整张照片等）→ null，不抠，免得抠坏原图。
 *
 * 认「四角全透明」而不是「存在透明像素」：白底 logo 带投影或导出瑕疵时也会有个别半透明像素，
 * 那类图仍需要抠底；反之墨迹顶到角上时四角不全透明，会落到后面两条判定，安全地不抠。
 */
function resolveBackdropColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number[] | null {
  const corners = cornerPixels(pixels, width, height);
  if (corners.every((corner) => corner[3]! <= WATERMARK_TRANSPARENT_ALPHA_MAX)) return null;

  let uniform = true;
  for (const a of corners) {
    for (const b of corners) {
      if (Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) > WATERMARK_BACKDROP_TOLERANCE) {
        uniform = false;
      }
    }
  }
  const allBright = corners.every(
    ([r, g, b]) => r! * 0.2126 + g! * 0.7152 + b! * 0.0722 > WATERMARK_LIGHT_BACKDROP_LUMINANCE,
  );
  if (!uniform && !allBright) return null;
  return [0, 1, 2].map((channel) =>
    clampByte(corners.reduce((sum, corner) => sum + corner[channel]!, 0) / corners.length),
  );
}

/**
 * 抠掉水印图的纯色底（logo / 署名多为白底卡片，直接贴上去就是一块白板），就地改写像素：
 * 距底色越远越不透明，并按「C = F·α + 底·(1−α)」反解前景色，抗锯齿边缘才不会发白留边。
 * 判定为透明底图、或四角看不出可抠的底（整张照片）时原样不动。
 */
export function stripWatermarkBackdrop(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return;
  const background = resolveBackdropColor(pixels, width, height);
  if (!background) return;

  // 全图距底色最远的像素即墨迹本色，以它作为满不透明的基准，浅色墨迹也不会被抠淡
  let inkDistance = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const distance = distanceToBackground(pixels, i, background);
    if (distance > inkDistance) inkDistance = distance;
  }
  if (inkDistance < WATERMARK_MIN_INK_DISTANCE) return;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = distanceToBackground(pixels, i, background) / inkDistance;
    if (alpha < WATERMARK_BACKDROP_ALPHA_CUTOFF) {
      pixels[i + 3] = 0;
      continue;
    }
    const opacity = Math.min(1, alpha);
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[i + channel] = clampByte(
        (pixels[i + channel]! - background[channel]! * (1 - opacity)) / opacity,
      );
    }
    pixels[i + 3] = clampByte(opacity * 255);
  }
}

/** 感知亮度（Rec.709）。 */
function luminanceOf(pixels: Uint8ClampedArray, offset: number): number {
  return pixels[offset]! * 0.2126 + pixels[offset + 1]! * 0.7152 + pixels[offset + 2]! * 0.0722;
}

/**
 * 按水印将要盖住的那块底图选墨色：偏亮用近黑墨、偏暗用白墨，否则浅色底上的白水印根本认不出来。
 * 看的是「偏亮像素占比」而不是平均亮度——几处高光不该把大片暗部判成浅底。
 */
export function resolveWatermarkInk(
  backdropPixels: Uint8ClampedArray,
): readonly [number, number, number] {
  let bright = 0;
  let total = 0;
  for (let i = 0; i < backdropPixels.length; i += 4) {
    if (luminanceOf(backdropPixels, i) > WATERMARK_BRIGHT_PIXEL_LUMINANCE) bright += 1;
    total += 1;
  }
  const brightFraction = total > 0 ? bright / total : 0;
  return brightFraction > 0.5 ? WATERMARK_INK_ON_LIGHT : WATERMARK_INK_ON_DARK;
}

/** 把抠好底的水印统一刷成单色墨（保留 alpha，边缘仍是软的）。 */
export function recolorWatermarkInk(
  pixels: Uint8ClampedArray,
  ink: readonly [number, number, number],
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    pixels[i] = ink[0];
    pixels[i + 1] = ink[1];
    pixels[i + 2] = ink[2];
  }
}

export type WatermarkRect = { x: number; y: number; width: number; height: number };

/**
 * 找墨迹（alpha 非 0）的包围盒。水印导出图四周常留大片透明边距，不裁掉的话
 * 「水印宽 = 成图宽 × 18%」会被边距吃掉一截，落点也被边距推开，不同文件还大小不一。
 */
export function findWatermarkInkBox(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): WatermarkRect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3]! <= WATERMARK_INK_ALPHA_MIN) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * 算水印在成图上的落点矩形（右下角）。尺寸与留白**只由成图宽度**推出并取整到整像素：
 * 公众号正文把所有配图按同一栏宽展示，1K / 2K、16:9 / 3:4 混排时页面上水印也就一样大、一样靠角。
 * 固定像素（小图上显大）或按高度取比例（横竖版忽大忽小）都做不到这一点。
 * 水印本身等比缩放进「宽 = 成图宽 × WATERMARK_WIDTH_RATIO」的方形盒子，故竖长水印会按高度回收。
 * 底部留白比右边大，为的是压在微信自带水印带之上（见 WATERMARK_BOTTOM_RATIO）。
 */
export function resolveWatermarkRect(input: {
  imageWidth: number;
  imageHeight: number;
  markWidth: number;
  markHeight: number;
}): WatermarkRect {
  const { imageWidth, imageHeight, markWidth, markHeight } = input;
  if (imageWidth <= 0 || imageHeight <= 0 || markWidth <= 0 || markHeight <= 0) {
    throw new Error('invalid image size');
  }
  const right = Math.round(imageWidth * WATERMARK_RIGHT_RATIO);
  const bottom = Math.round(imageWidth * WATERMARK_BOTTOM_RATIO);
  const boxWidth = Math.round(imageWidth * WATERMARK_WIDTH_RATIO);
  const scale = Math.min(boxWidth / markWidth, boxWidth / markHeight);
  const width = Math.max(1, Math.round(markWidth * scale));
  const height = Math.max(1, Math.round(markHeight * scale));
  return { x: imageWidth - width - right, y: imageHeight - height - bottom, width, height };
}

/** 抠底并把画布裁到墨迹边界，得到「尺寸即墨迹大小」的透明层（颜色仍为原色，待选墨色后再刷）。 */
function toWatermarkInkLayer(mark: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mark.naturalWidth;
  canvas.height = mark.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');
  context.drawImage(mark, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  stripWatermarkBackdrop(imageData.data, canvas.width, canvas.height);
  context.putImageData(imageData, 0, 0);

  const box = findWatermarkInkBox(imageData.data, canvas.width, canvas.height);
  if (!box || (box.width === canvas.width && box.height === canvas.height)) return canvas;
  const trimmed = document.createElement('canvas');
  trimmed.width = box.width;
  trimmed.height = box.height;
  const trimContext = trimmed.getContext('2d');
  if (!trimContext) throw new Error('canvas context unavailable');
  trimContext.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  return trimmed;
}

/** 把整层刷成单色墨（保留 alpha，边缘仍是软的）。 */
function paintWatermarkLayer(
  layer: HTMLCanvasElement,
  ink: readonly [number, number, number],
): HTMLCanvasElement {
  const context = layer.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');
  const imageData = context.getImageData(0, 0, layer.width, layer.height);
  recolorWatermarkInk(imageData.data, ink);
  context.putImageData(imageData, 0, 0);
  return layer;
}

/**
 * 把水印图叠加到成图右下角，返回新 data URL。
 * 解码或画布不可用时抛错，由调用方决定是否回落原图。
 */
export async function composeWatermark(baseUrl: string, watermarkUrl: string): Promise<string> {
  const baseDataUrl = await resolveImageDataUrl(baseUrl);
  const [base, mark] = await Promise.all([
    loadImageElement(baseDataUrl),
    resolveImageDataUrl(watermarkUrl).then(loadImageElement),
  ]);
  const width = base.naturalWidth;
  const height = base.naturalHeight;
  if (!width || !height || !mark.naturalWidth || !mark.naturalHeight) {
    throw new Error('invalid image size');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');
  context.drawImage(base, 0, 0, width, height);
  // 先抠底裁边距，拿到墨迹的真实尺寸，落点才不会被导出图自带的留白带偏
  const layer = toWatermarkInkLayer(mark);
  const rect = resolveWatermarkRect({
    imageWidth: width,
    imageHeight: height,
    markWidth: layer.width,
    markHeight: layer.height,
  });
  // 只读水印将要盖住的那块：底图这一块偏亮还是偏暗，决定水印用黑墨还是白墨
  const backdrop = context.getImageData(rect.x, rect.y, rect.width, rect.height);
  // 整体降透明度：水印是压印，不能让画面主体退居其次；抗锯齿边缘的软 alpha 一并等比压低
  context.globalAlpha = WATERMARK_OPACITY;
  context.drawImage(
    paintWatermarkLayer(layer, resolveWatermarkInk(backdrop.data)),
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
  context.globalAlpha = 1;
  // 沿用原图 mime，避免 PNG 成图被无谓转成 JPEG；透明水印的通道由画布保留
  const mimeType = /^data:(image\/[^;,]+)/.exec(baseDataUrl)?.[1] ?? 'image/png';
  return canvas.toDataURL(mimeType, WATERMARK_JPEG_QUALITY);
}

/** 若正文尚未以给定标题开头，则前置一级 Markdown 标题。 */
export function ensureMarkdownLeadingTitle(title: string | undefined, markdown: string): string {
  const trimmedTitle = title?.trim();
  const body = markdown.trim();
  if (!trimmedTitle || !body) return body;
  const firstLine = body.split(/\r?\n/, 1)[0]?.trim() ?? '';
  const headingText = firstLine.replace(/^#{1,6}\s+/, '').trim();
  if (headingText === trimmedTitle || firstLine === trimmedTitle) return body;
  return `# ${trimmedTitle}\n\n${body}`;
}

/** 构建一键复制的正文（含可选标题；去掉配图标注行）。 */
export function buildCopyArticleText(titles: string[] | undefined, markdown: string): string {
  return ensureMarkdownLeadingTitle(titles?.[0], stripImageMarkers(markdown));
}

/** 将 File 读为 data URL。 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('read failed'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * 上传项落盘用的预览地址：本地文件读成 data URL，历史资产原样返回；无图返回 undefined。
 *
 * 服务端契约里水印图与风格参考图各只有一张，故只取第一张。
 * 返回 undefined 而不是空串，是为了让调用方能把「没有图」表达成「不写这个键」。
 */
export async function toPersistableImageUrl(
  images: readonly StudioImageUploadItem[],
): Promise<string | undefined> {
  const first = images[0];
  if (!first) return undefined;
  return first.file ? readFileAsDataUrl(first.file) : first.previewUrl;
}

/** 把服务端回的单个资产 URL 还原成上传项；无 URL 返回空数组。 */
export function toImageItems(url: string | undefined): StudioImageUploadItem[] {
  return url ? [{ uid: crypto.randomUUID(), previewUrl: url }] : [];
}
