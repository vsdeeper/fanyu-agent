import {
  CHARACTER_GENDER_OPTIONS,
  CHARACTER_ROLE_OPTIONS,
  EMPTY_FIELD_TEXT,
  NOVEL_MARKDOWN_EXPORT_VERSION,
} from '../constants';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  NovelSection,
  NovelVolumeDesign,
  PlanStepSnapshot,
  VolumesStepSnapshot,
  WorldviewStepSnapshot,
} from '../types';
import {
  readCastStepSnapshot,
  readChaptersStepSnapshot,
  readPlanStepSnapshot,
  readVolumesStepSnapshot,
  readWorldviewStepSnapshot,
} from '../utils';
import { formatChapterPrefix, stripChapterPrefix, toChineseNumeral } from './ChapterList/utils';

export type NovelMarkdownExportType = 'cast' | 'plan' | 'chapters' | 'worldview' | 'volumes';

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

/** 把通用两级章节整理成人可读的 Markdown。 */
function formatSectionsMarkdown(sections: NovelSection[]): string {
  return sections
    .map((section) => {
      const blocks = section.blocks
        .map((block) =>
          [`### ${block.title.trim() || EMPTY_FIELD_TEXT}`, '', block.body].join('\n'),
        )
        .join('\n\n');
      return [`## ${section.title.trim() || EMPTY_FIELD_TEXT}`, '', blocks].join('\n');
    })
    .join('\n\n');
}

function roleLabel(role: string): string {
  return CHARACTER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function genderLabel(gender: string | undefined): string {
  return CHARACTER_GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? '未填写';
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

/** 把世界观设定整理成人可读的 Markdown。 */
export function buildWorldviewMarkdown(snapshot: WorldviewStepSnapshot): string {
  const markdown = [`# 世界观设定`, '', formatSectionsMarkdown(snapshot.sections)].join('\n');
  return appendExportEnvelope(markdown, 'worldview', snapshot);
}

/** 把叙事卷整理成人可读的 Markdown。 */
function formatVolumesMarkdown(volumes: NovelVolumeDesign[]): string {
  return volumes
    .map((volume, index) => {
      const beats = volume.beats
        .map((beat, beatIndex) => {
          const event = beat.event ? `：${beat.event}` : '';
          return `${beatIndex + 1}. ${beat.title.trim() || '未写'}${event}`;
        })
        .join('\n');
      return [
        `## 第${toChineseNumeral(index + 1)}卷　${volume.title.trim() || '未命名'}`,
        '',
        `- 核心冲突：${volume.conflict.trim() || '未写'}`,
        `- 卷末钩子：${volume.hook.trim() || '未写'}`,
        '',
        `### 节拍（按时间）`,
        '',
        beats || '未写',
      ].join('\n');
    })
    .join('\n\n');
}

/** 旧方案残留的主线、终局与主题，新方案不再写。 */
function formatLegacyPlanExtras(plan: PlanStepSnapshot): string {
  const parts: string[] = [];
  if (plan.threads && plan.threads.length > 0) {
    parts.push(
      [
        '## 核心主线',
        '',
        ...plan.threads.map((thread) => `### ${thread.name}\n\n${thread.core}`),
      ].join('\n\n'),
    );
  }
  if (plan.ending?.trim()) parts.push(['## 终局', '', plan.ending.trim()].join('\n'));
  if (plan.theme?.trim()) parts.push(['## 主题', '', plan.theme.trim()].join('\n'));
  return parts.join('\n\n');
}

/** 把创作方案整理成人可读的 Markdown。 */
export function buildPlanMarkdown(plan: PlanStepSnapshot): string {
  const legacy = formatLegacyPlanExtras(plan);
  const markdown = [
    `# 创作方案`,
    '',
    formatSectionsMarkdown(plan.sections),
    ...(legacy ? ['', legacy] : []),
  ].join('\n');
  return appendExportEnvelope(markdown, 'plan', plan);
}

/** 把卷纲设计整理成人可读的 Markdown。节拍里的角色用姓名。 */
export function buildVolumesMarkdown(snapshot: VolumesStepSnapshot): string {
  const markdown = [`# 卷纲设计`, '', formatVolumesMarkdown(snapshot.volumes)].join('\n');
  return appendExportEnvelope(markdown, 'volumes', snapshot);
}

/** 卷章设计整理成人可读的 Markdown。只写已经出过章卡的那些卷。 */
export function buildChaptersMarkdown(
  volumes: VolumesStepSnapshot | undefined,
  chapters: ChaptersSnapshot,
): string {
  let index = 0;
  const names = new Map((volumes?.volumes ?? []).map((volume) => [volume.id, volume.title]));
  const body = chapters.volumes
    .map((volume) => {
      const cards = volume.chapters
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
      return [`## ${names.get(volume.id) ?? volume.id}`, '', cards].join('\n');
    })
    .join('\n\n');
  return appendExportEnvelope([`# 卷章设计`, '', body].join('\n'), 'chapters', chapters);
}

export function parseWorldviewMarkdownImport(
  markdown: string,
): NovelMarkdownImportResult<WorldviewStepSnapshot> {
  const envelope = parseExportEnvelope(markdown, 'worldview');
  if (!envelope.ok) return envelope;
  const snapshot = readWorldviewStepSnapshot(envelope.data);
  if (!snapshot) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: snapshot };
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

export function parseVolumesMarkdownImport(
  markdown: string,
): NovelMarkdownImportResult<VolumesStepSnapshot> {
  const envelope = parseExportEnvelope(markdown, 'volumes');
  if (!envelope.ok) return envelope;
  const volumes = readVolumesStepSnapshot(envelope.data);
  if (!volumes) return { ok: false, error: 'invalid-payload' };
  return { ok: true, data: volumes };
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
