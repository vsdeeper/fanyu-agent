import {
  CHARACTER_GENDER_OPTIONS,
  CHARACTER_ROLE_OPTIONS,
  NOVEL_MARKDOWN_EXPORT_VERSION,
} from '../constants';
import type { CastStepSnapshot, ChaptersSnapshot, NovelPlan, PlanStepSnapshot } from '../types';
import { readCastStepSnapshot, readChaptersStepSnapshot, readPlanStepSnapshot } from '../utils';
import { formatChapterPrefix, stripChapterPrefix, toChineseNumeral } from './ChapterList/utils';

export type NovelMarkdownExportType = 'cast' | 'plan' | 'chapters';

export type NovelMarkdownImportError =
  'missing-payload' | 'invalid-payload' | 'wrong-type' | 'unsupported-version';

export type NovelMarkdownImportResult<T> =
  { ok: true; data: T } | { ok: false; error: NovelMarkdownImportError };

type NovelMarkdownEnvelope = {
  version: number;
  type: NovelMarkdownExportType;
  data: unknown;
};

const EXPORT_MARKER = 'fanyu-novel-export';
const EXPORT_BLOCK_PATTERN = /<!--\s*fanyu-novel-export\s+([A-Za-z0-9+/=\r\n]+?)\s*-->/;

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeUtf8Base64(value: string): string | undefined {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function appendExportEnvelope(
  markdown: string,
  type: NovelMarkdownExportType,
  data: unknown,
): string {
  const envelope: NovelMarkdownEnvelope = {
    version: NOVEL_MARKDOWN_EXPORT_VERSION,
    type,
    data,
  };
  const payload = encodeUtf8Base64(JSON.stringify(envelope));
  return `${markdown.trimEnd()}\n\n<!-- ${EXPORT_MARKER}\n${payload}\n-->\n`;
}

function parseExportEnvelope(
  markdown: string,
  expectedType: NovelMarkdownExportType,
): NovelMarkdownImportResult<unknown> {
  const match = markdown.match(EXPORT_BLOCK_PATTERN);
  if (!match?.[1]) return { ok: false, error: 'missing-payload' };
  const decoded = decodeUtf8Base64(match[1].replace(/\s/g, ''));
  if (!decoded) return { ok: false, error: 'invalid-payload' };
  let envelope: unknown;
  try {
    envelope = JSON.parse(decoded);
  } catch {
    return { ok: false, error: 'invalid-payload' };
  }
  if (!envelope || typeof envelope !== 'object') return { ok: false, error: 'invalid-payload' };
  const record = envelope as Record<string, unknown>;
  if (record.version !== NOVEL_MARKDOWN_EXPORT_VERSION)
    return { ok: false, error: 'unsupported-version' };
  if (record.type !== expectedType) return { ok: false, error: 'wrong-type' };
  if (!('data' in record)) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: record.data };
}

function roleLabel(role: string): string {
  return CHARACTER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function genderLabel(gender: string | undefined): string {
  return CHARACTER_GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? '不标明';
}

/** 把当前角色整理成人可读的 Markdown。 */
export function buildCastMarkdown(cast: CastStepSnapshot): string {
  const names = new Map(cast.characters.map((character) => [character.id, character.name.trim()]));
  const characters = cast.characters
    .map((character) => {
      const arc = [
        character.arc?.early ? `初期：${character.arc.early}` : '',
        character.arc?.mid ? `中期：${character.arc.mid}` : '',
        character.arc?.late ? `后期：${character.arc.late}` : '',
        character.arc?.end ? `终局：${character.arc.end}` : '',
      ]
        .filter(Boolean)
        .join('；');
      return [
        `### ${character.name.trim() || '未命名'}`,
        '',
        `- 定位：${roleLabel(character.role)}`,
        `- 性别：${genderLabel(character.gender)}`,
        `- 出身：${character.origin.trim()}`,
        `- 特质：${character.trait.trim()}`,
        ...(arc ? [`- 变化：${arc}`] : []),
      ].join('\n');
    })
    .join('\n\n');
  const relations =
    cast.relations.length > 0
      ? cast.relations
          .map((relation) => {
            const from = names.get(relation.fromId) ?? relation.fromId;
            const to = names.get(relation.toId) ?? relation.toId;
            const stages = [
              relation.arc?.early ? `初期：${relation.arc.early}` : '',
              relation.arc?.mid ? `中期：${relation.arc.mid}` : '',
              relation.arc?.late ? `后期：${relation.arc.late}` : '',
            ]
              .filter(Boolean)
              .join('；');
            return `- ${from} — ${relation.label}${stages ? `（${stages}）` : ''} — ${to}`;
          })
          .join('\n')
      : '无';
  const markdown = [`# 角色设定`, '', `## 人物`, '', characters, '', `## 关系`, '', relations].join(
    '\n',
  );
  return appendExportEnvelope(markdown, 'cast', cast);
}

/** 把创作方案整理成人可读的 Markdown。 */
export function buildPlanMarkdown(plan: PlanStepSnapshot): string {
  const volumeTitle = new Map(plan.volumes.map((volume) => [volume.id, volume.title]));
  const threads = plan.threads
    .map((thread) => {
      const advances = thread.advances
        .map(
          (advance) =>
            `- ${volumeTitle.get(advance.volumeId) ?? advance.volumeId}：${advance.text}`,
        )
        .join('\n');
      return [`### ${thread.name}`, '', thread.core, '', advances].join('\n');
    })
    .join('\n\n');
  const volumes = plan.volumes
    .map(
      (volume, index) =>
        `### 第${toChineseNumeral(index + 1)}卷　${volume.title}\n\n- 范围：${volume.geography}\n- 核心冲突：${volume.conflict}\n- 本卷结果：${volume.outcome?.trim() || '未写'}\n- 目标字数：${volume.targetChars}`,
    )
    .join('\n\n');
  const markdown = [
    `# 创作方案`,
    '',
    `## 核心主线`,
    '',
    threads,
    '',
    `## 分卷结构`,
    '',
    volumes,
  ].join('\n');
  return appendExportEnvelope(markdown, 'plan', plan);
}

/** 把卷章设计整理成人可读的 Markdown。卷标题来自创作方案。 */
export function buildChaptersMarkdown(plan: NovelPlan, chapters: ChaptersSnapshot): string {
  let index = 0;
  const volumes = plan.volumes
    .map((volume) => {
      const cards = chapters.volumes.find((item) => item.id === volume.id)?.chapters ?? [];
      const body = cards
        .map((chapter) => {
          index += 1;
          const title = stripChapterPrefix(chapter.title);
          return [
            `### ${formatChapterPrefix(index)}${title ? `　${title}` : ''}`,
            '',
            `- 场景：${chapter.scene}`,
            `- 事件：${chapter.event}`,
            `- 钩子：${chapter.hook}`,
          ].join('\n');
        })
        .join('\n\n');
      return [`## ${volume.title}`, '', body || '尚未生成章卡'].join('\n');
    })
    .join('\n\n');
  return appendExportEnvelope([`# 卷章设计`, '', volumes].join('\n'), 'chapters', chapters);
}

export function parseCastMarkdownImport(
  markdown: string,
): NovelMarkdownImportResult<CastStepSnapshot> {
  const envelope = parseExportEnvelope(markdown, 'cast');
  if (!envelope.ok) return envelope;
  const cast = readCastStepSnapshot(envelope.data);
  if (!cast) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: cast };
}

export function parsePlanMarkdownImport(
  markdown: string,
): NovelMarkdownImportResult<PlanStepSnapshot> {
  const envelope = parseExportEnvelope(markdown, 'plan');
  if (!envelope.ok) return envelope;
  const plan = readPlanStepSnapshot(envelope.data);
  if (!plan) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: plan };
}

export function parseChaptersMarkdownImport(
  markdown: string,
): NovelMarkdownImportResult<ChaptersSnapshot> {
  const envelope = parseExportEnvelope(markdown, 'chapters');
  if (!envelope.ok) return envelope;
  const chapters = readChaptersStepSnapshot(envelope.data);
  if (!chapters) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: chapters };
}

/** 触发浏览器下载一份 Markdown。 */
export function downloadMarkdown(filename: string, mediaType: string, markdown: string) {
  const blob = new Blob([markdown], { type: mediaType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
