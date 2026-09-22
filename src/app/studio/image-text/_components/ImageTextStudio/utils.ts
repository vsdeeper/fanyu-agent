import { IMAGE_TEXT_CAPTION_SECTION_TITLE } from '@/app/api/studio/image-text/_shared/constants';
import { IMAGE_TEXT_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/image-text/_shared/task-constants';
import type {
  ImageTextStepKey,
  ImageTextTaskStepRecord,
} from '@/app/api/studio/image-text/_shared/task-types';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload';
import { apiPut } from '@/lib/shared/client/api-client';
import { readFileAsDataUrl } from '@/app/studio/_utils/upload-items';
import { DEFAULT_IMAGE_ASPECT, DEFAULT_IMAGE_CLARITY, DEFAULT_IMAGE_MODEL } from './constants';
import type {
  ImageTextCard,
  ImageTextGenerateSnapshot,
  ImageTextGeneratedImage,
  ImageTextPhase,
  ImageTextPlanSnapshot,
  ImageTextPreviewSlide,
  ImageTextRatioGroup,
  ImageTextView,
} from './types';

export { assertOkOrJsonFail, isAbortError } from '@/app/studio/_utils/generate-stream';
export { consumeAnalyzeSse, createRafTextBuffer } from '@/app/studio/_utils/analyze-stream';
export { consumeGenerateNdjson } from '@/app/studio/_utils/generate-stream';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

type MarkdownSection = {
  title: string;
  body: string;
  /** 整节起止，含 `## 标题` 行。 */
  fullStart: number;
  fullEnd: number;
};

/** 按二级标题切开 Markdown；标题行计入 full 区间。 */
function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const headingRe = /^##\s+(.+)$/gm;
  let match = headingRe.exec(markdown);
  while (match) {
    const title = match[1]?.trim() ?? '';
    const fullStart = match.index;
    const bodyStart = match.index + match[0].length;
    const next = headingRe.exec(markdown);
    const fullEnd = next ? next.index : markdown.length;
    sections.push({
      title,
      body: markdown.slice(bodyStart, fullEnd).trim(),
      fullStart,
      fullEnd,
    });
    match = next;
  }
  return sections;
}

/** 去掉可选的全文 Markdown 围栏。 */
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const open = /^```(?:markdown|md)?\s*\n?/i.exec(trimmed);
  if (!open) return trimmed;
  const body = trimmed.slice(open[0].length);
  return body.replace(/\n?```\s*$/, '').trim();
}

/** 规范化图文卡片正文；空串视为无效。 */
export function normalizeCardBody(text: string): string | null {
  const body = stripMarkdownFence(text);
  return body ? body : null;
}

/** 去掉引用行首的 `>`，得到纯配文。 */
export function unwrapBlockquote(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^>\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

/**
 * 定位 `# 标题` 后、首个 `##` 之前的连续 `>` 引用块。
 * 返回字符区间与纯文本；没有则 undefined。
 */
function findCaptionBlockquote(
  body: string,
): { fullStart: number; fullEnd: number; text: string } | undefined {
  const lines = body.split('\n');
  let i = 0;
  const titleIndex = lines.findIndex((line) => /^#\s+\S/.test(line));
  if (titleIndex >= 0) i = titleIndex + 1;
  while (i < lines.length && !lines[i]?.trim()) i += 1;
  if (i >= lines.length || !/^\s*>/.test(lines[i] ?? '')) return undefined;

  const startLine = i;
  while (i < lines.length && /^\s*>/.test(lines[i] ?? '')) i += 1;
  const endLine = i;
  const quoteLines = lines.slice(startLine, endLine);
  const text = unwrapBlockquote(quoteLines.join('\n'));
  if (!text) return undefined;

  let fullStart = 0;
  for (let n = 0; n < startLine; n += 1) fullStart += (lines[n]?.length ?? 0) + 1;
  let fullEnd = fullStart;
  for (let n = startLine; n < endLine; n += 1) fullEnd += (lines[n]?.length ?? 0) + 1;
  return { fullStart, fullEnd: Math.min(fullEnd, body.length), text };
}

/**
 * 从正文读取配文：优先 `# 标题` 后的 `> 摘要`；兼容旧任务 `## 配文` 小节。
 */
export function parseCaptionFromBody(body: string): string | undefined {
  const quote = findCaptionBlockquote(body);
  if (quote?.text) return quote.text;

  const section = splitMarkdownSections(body).find(
    (item) => item.title === IMAGE_TEXT_CAPTION_SECTION_TITLE,
  );
  const caption = section?.body ? unwrapBlockquote(section.body) : '';
  return caption || undefined;
}

/**
 * 去掉正文中的配文（`> 摘要` 或旧 `## 配文`），供生图提示使用。
 * 配文只给预览，不应进入画面提示词。
 */
export function stripCaptionFromBody(body: string): string {
  const quote = findCaptionBlockquote(body);
  if (quote) {
    return `${body.slice(0, quote.fullStart)}${body.slice(quote.fullEnd)}`.trim();
  }
  const section = splitMarkdownSections(body).find(
    (item) => item.title === IMAGE_TEXT_CAPTION_SECTION_TITLE,
  );
  if (!section) return body.trim();
  return `${body.slice(0, section.fullStart)}${body.slice(section.fullEnd)}`.trim();
}

/** 旧任务：把视觉风格与图文页拼成可读正文，便于迁移展示。 */
export function formatLegacyCardsToBody(
  cards: readonly ImageTextCard[],
  visualStyle?: string,
): string {
  const parts: string[] = [];
  const firstTitle = cards[0]?.title?.trim();
  if (firstTitle) parts.push(`# ${firstTitle}`, '');
  if (visualStyle?.trim()) {
    parts.push(`> ${visualStyle.trim()}`, '');
  }
  for (const card of cards) {
    if (card.title.trim()) parts.push(`## ${card.title.trim()}`, '');
    if (card.caption.trim()) parts.push(card.caption.trim(), '');
  }
  return parts.join('\n').trim();
}

function readLegacyCards(data: Record<string, unknown>): ImageTextCard[] {
  if (!Array.isArray(data.cards)) return [];
  const cards: ImageTextCard[] = [];
  const usedIds = new Set<string>();
  for (const item of data.cards) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const title = asString(row.title);
    const prompt = asString(row.prompt);
    const caption = asString(row.caption);
    if (!title || !prompt || !caption) continue;
    let id = asString(row.id) ?? `card-${cards.length + 1}`;
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    usedIds.add(id);
    cards.push({ id, title, prompt, caption });
  }
  return cards;
}

function isView(value: unknown): value is ImageTextView {
  return value === 'plan' || value === 'generate' || value === 'preview';
}

/** 读取内容步骤快照；结构不对时返回 undefined。 */
export function readPlanSnapshot(data: unknown): ImageTextPlanSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const materialUrls = Array.isArray(record.materialUrls)
    ? record.materialUrls.filter(
        (item): item is string => typeof item === 'string' && Boolean(item),
      )
    : [];
  const cards = readLegacyCards(record);
  const storedBody = asString(record.body);
  const streamText = asString(record.streamText);
  const legacyVisualStyle = asString(record.visualStyle);
  const body =
    storedBody ??
    (streamText ? normalizeCardBody(streamText) : null) ??
    (cards.length ? formatLegacyCardsToBody(cards, legacyVisualStyle) : '') ??
    '';
  const caption = asString(record.caption) ?? parseCaptionFromBody(body) ?? cards[0]?.caption ?? '';
  return {
    content: asString(record.content) ?? asString(record.requirement) ?? '',
    materialUrls,
    body,
    caption,
    cards,
    ...(asString(record.selectedCardId) ? { selectedCardId: asString(record.selectedCardId) } : {}),
    view: isView(record.view) ? record.view : 'plan',
    ...(streamText ? { streamText } : {}),
  };
}

/** 读取生成步骤快照。 */
export function readGenerateSnapshot(data: unknown): ImageTextGenerateSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const images: ImageTextGeneratedImage[] = [];
  if (Array.isArray(record.images)) {
    for (const item of record.images) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = asString(row.id);
      const cardId = asString(row.cardId);
      const aspectRatio = asString(row.aspectRatio);
      const url = asString(row.url);
      const createdAt = asString(row.createdAt);
      if (!id || !cardId || !aspectRatio || !url || !createdAt) continue;
      images.push({
        id,
        cardId,
        aspectRatio,
        url,
        selected: row.selected === true,
        createdAt,
        ...(asString(row.cardTitle) ? { cardTitle: asString(row.cardTitle) } : {}),
        ...(asString(row.cardCaption) ? { cardCaption: asString(row.cardCaption) } : {}),
      });
    }
  }
  return {
    model: asString(record.model) ?? DEFAULT_IMAGE_MODEL,
    aspectRatio: asString(record.aspectRatio) ?? DEFAULT_IMAGE_ASPECT,
    clarity: asString(record.clarity) ?? DEFAULT_IMAGE_CLARITY,
    images,
    ...(asString(record.styleReferenceUrl)
      ? { styleReferenceUrl: asString(record.styleReferenceUrl) }
      : {}),
    ...(asString(record.characterModelUrl)
      ? { characterModelUrl: asString(record.characterModelUrl) }
      : {}),
    ...(asString(record.characterRequirement)
      ? { characterRequirement: asString(record.characterRequirement) }
      : {}),
  };
}

/** 刷新后停在上次步骤；没有图文正文时回到内容步。 */
export function resolveInitialPhase(
  plan: ImageTextPlanSnapshot | undefined,
  generate: ImageTextGenerateSnapshot | undefined,
): ImageTextPhase {
  if (!plan?.body.trim()) return 'plan';
  if (plan.view === 'preview' && generate?.images.some((item) => item.selected)) return 'preview';
  if (plan.view === 'generate' || plan.view === 'preview') return 'generate';
  return 'planned';
}

/** 把单个资产 URL 还原成上传项；无 URL 返回空数组。 */
export function toImageItems(url: string | undefined): StudioImageUploadItem[] {
  return url ? [{ uid: crypto.randomUUID(), previewUrl: url }] : [];
}

/** 把素材 URL 列表还原成上传项。 */
export function toMaterialItems(urls: readonly string[]): StudioImageUploadItem[] {
  return urls.map((previewUrl) => ({ uid: crypto.randomUUID(), previewUrl }));
}

/** 从正文取一级标题；没有则返回空。 */
export function titleFromBody(body: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(body);
  const title = match?.[1]?.trim();
  return title || undefined;
}

/** 已出图仅按比例分组，组内按出图时间。 */
export function groupImagesByAspectRatio(
  images: readonly ImageTextGeneratedImage[],
): ImageTextRatioGroup[] {
  const sorted = images.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ratios: ImageTextRatioGroup[] = [];
  for (const image of sorted) {
    const group = ratios.find((item) => item.ratio === image.aspectRatio);
    if (group) group.images.push(image);
    else ratios.push({ ratio: image.aspectRatio, images: [image] });
  }
  return ratios;
}

/**
 * 预览页：勾选图片按出图时间排序。
 * 配文由内容步固定提供，不写进各 slide，避免随轮播切换变化。
 */
export function buildPreviewSlides(
  images: readonly ImageTextGeneratedImage[],
): ImageTextPreviewSlide[] {
  return images
    .filter((item) => item.selected)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((image) => ({
      id: image.id,
      url: image.url,
      title: image.cardTitle ?? '已生成',
    }));
}

/** 上传项转成可落盘的 URL（本地文件读成 data URL）。 */
export async function toPersistableImageUrl(
  images: readonly StudioImageUploadItem[],
): Promise<string | undefined> {
  const first = images[0];
  if (!first) return undefined;
  return first.file ? readFileAsDataUrl(first.file) : first.previewUrl;
}

/** 落盘图文步骤快照，返回服务端资产 URL 化后的 data。 */
export async function saveImageTextStep<T>(
  taskId: string,
  stepKey: ImageTextStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<ImageTextTaskStepRecord>(
    `/api/studio/image-text/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: IMAGE_TEXT_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}
