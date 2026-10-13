import 'server-only';

import { eq } from 'drizzle-orm';
import { rewriteLegacyStudioAssetUrls } from '@/app/api/studio/_server/rewrite-legacy-asset-urls';
import { getDb } from '@/lib/db/client';
import { novelTaskSteps } from '@/lib/db/schema';
import { NOVEL_STEP_KEYS } from '../_shared/task-constants';
import type {
  NovelStepKey,
  NovelTaskDetail,
  NovelTaskListData,
  NovelTaskListItem,
} from '../_shared/task-types';

type StepRow = {
  taskId: string;
  stepKey: string;
  snapshotVersion: number;
  data: string;
  updatedAt: string;
};

/** 把旧步骤键 bible / structure 映射到角色、方案与卷章，供打开历史任务。 */
export function mergeLegacyNovelDetail(detail: NovelTaskDetail, rows: StepRow[]): NovelTaskDetail {
  const steps = { ...detail.steps };
  const bibleRow = rows.find((row) => row.stepKey === 'bible');
  const structureRow = rows.find((row) => row.stepKey === 'structure');
  const bible = bibleRow ? parseStepData(bibleRow.data) : undefined;

  if (!steps.cast && bible) {
    const cast = mapBibleToCast(bible);
    if (cast) {
      steps.cast = {
        stepKey: 'cast',
        snapshotVersion: bibleRow?.snapshotVersion ?? 1,
        data: cast,
        updatedAt: bibleRow?.updatedAt ?? detail.updatedAt,
      };
    }
  }

  const structure = structureRow ? parseStepData(structureRow.data) : undefined;
  const mapped = structure ? mapStructure(structure) : undefined;
  if (!steps.plan && mapped?.plan) {
    steps.plan = {
      stepKey: 'plan',
      snapshotVersion: structureRow?.snapshotVersion ?? 1,
      data: mapped.plan,
      updatedAt: structureRow?.updatedAt ?? detail.updatedAt,
    };
  }
  if (!steps.chapters && mapped?.chapters) {
    steps.chapters = {
      stepKey: 'chapters',
      snapshotVersion: structureRow?.snapshotVersion ?? 1,
      data: mapped.chapters,
      updatedAt: structureRow?.updatedAt ?? detail.updatedAt,
    };
  }

  if (steps.write && bible) {
    steps.write = {
      ...steps.write,
      data: mergeNarrationIntoWrite(steps.write.data, bible),
    };
  }

  return { ...detail, steps };
}

/** 列表上的已完成步骤：旧键显示成新步骤名。 */
export function mergeLegacyCompletedKeys(
  taskId: string,
  completed: readonly NovelStepKey[],
  rows: StepRow[],
): NovelStepKey[] {
  const keys = new Set(completed);
  const own = rows.filter((row) => row.taskId === taskId);
  if (own.some((row) => row.stepKey === 'bible')) keys.add('cast');
  const structure = own.find((row) => row.stepKey === 'structure');
  if (structure) {
    keys.add('plan');
    const mapped = mapStructure(parseStepData(structure.data));
    if (mapped?.chapters) keys.add('chapters');
  }
  return NOVEL_STEP_KEYS.filter((key) => keys.has(key));
}

/** 读取一本任务的全部步骤行，含已不再识别的旧键。 */
export function readNovelStepRows(taskId: string): StepRow[] {
  return getDb()
    .select()
    .from(novelTaskSteps)
    .where(eq(novelTaskSteps.taskId, taskId))
    .all() as StepRow[];
}

/** 读取全部步骤行，供任务列表把旧键映射成新步骤。 */
export function readAllNovelStepRows(): StepRow[] {
  return getDb().select().from(novelTaskSteps).all() as StepRow[];
}

/** 给列表项补上由旧步骤映射来的完成标记。 */
export function withLegacyListKeys(data: NovelTaskListData, rows: StepRow[]): NovelTaskListData {
  const items: NovelTaskListItem[] = data.items.map((item) => ({
    ...item,
    completedStepKeys: mergeLegacyCompletedKeys(item.id, item.completedStepKeys, rows),
  }));
  return { ...data, items };
}

function parseStepData(raw: string): unknown {
  try {
    return rewriteLegacyStudioAssetUrls(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapBibleToCast(
  data: unknown,
): { characters: unknown[]; relations: unknown[] } | undefined {
  const record = asRecord(data);
  if (!record || !Array.isArray(record.characters)) return undefined;
  const characters = record.characters.map(mapCharacter).filter((item) => item !== null);
  if (characters.length === 0) return undefined;
  const ids = new Set(characters.map((item) => item.id));
  const relations = Array.isArray(record.relations)
    ? record.relations.map((item) => mapRelation(item, ids)).filter((item) => item !== null)
    : [];
  return { characters, relations };
}

function mapCharacter(value: unknown): {
  id: string;
  name: string;
  role: string;
  gender?: string;
  origin: string;
  trait: string;
  arc?: Record<string, string>;
} | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const name = asString(record.name);
  const role = record.role;
  if (!id || !name) return null;
  if (role !== 'protagonist' && role !== 'antagonist' && role !== 'supporting') return null;
  const origin = asString(record.origin) || asString(record.identity);
  const trait =
    asString(record.trait) ||
    [asString(record.desire), asString(record.flaw)].filter(Boolean).join('；');
  const gender = record.gender;
  const arc = mapArc(record.arc);
  return {
    id,
    name,
    role,
    ...(gender === 'female' || gender === 'male' || gender === 'unspecified' ? { gender } : {}),
    origin,
    trait,
    ...(arc ? { arc } : {}),
  };
}

function mapArc(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const arc: Record<string, string> = {};
  for (const key of ['early', 'mid', 'late', 'end'] as const) {
    const text = asString(record[key]);
    if (text) arc[key] = text;
  }
  return Object.keys(arc).length > 0 ? arc : undefined;
}

function mapRelation(
  value: unknown,
  ids: Set<string>,
): { fromId: string; toId: string; label: string } | null {
  const record = asRecord(value);
  if (!record) return null;
  const fromId = asString(record.fromId);
  const toId = asString(record.toId);
  const label = asString(record.label);
  if (!fromId || !toId || !label || fromId === toId) return null;
  if (!ids.has(fromId) || !ids.has(toId)) return null;
  return { fromId, toId, label };
}

function mapStructure(data: unknown):
  | {
      plan?: { threads: []; volumes: unknown[] };
      chapters?: { volumes: unknown[] };
    }
  | undefined {
  const record = asRecord(data);
  if (!record || record.kind !== 'volumes' || !Array.isArray(record.volumes)) return undefined;
  const volumes: unknown[] = [];
  const chapterVolumes: unknown[] = [];
  for (const item of record.volumes) {
    const volume = asRecord(item);
    if (!volume) continue;
    const id = asString(volume.id);
    const title = asString(volume.title);
    const conflict = asString(volume.conflict) || asString(volume.purpose);
    if (!id || !title || !conflict) continue;
    const targetChars =
      typeof volume.targetChars === 'number' && volume.targetChars > 0
        ? Math.round(volume.targetChars)
        : 200000;
    volumes.push({
      id,
      title,
      geography: asString(volume.geography) || '未标明',
      conflict,
      targetChars,
    });
    const chapters = Array.isArray(volume.chapters)
      ? volume.chapters.map(mapChapter).filter((chapter) => chapter !== null)
      : [];
    if (chapters.length > 0) chapterVolumes.push({ id, chapters });
  }
  if (volumes.length === 0) return undefined;
  return {
    plan: { threads: [], volumes },
    ...(chapterVolumes.length > 0 ? { chapters: { volumes: chapterVolumes } } : {}),
  };
}

function mapChapter(value: unknown): {
  id: string;
  title: string;
  scene: string;
  event: string;
  hook: string;
} | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const title = asString(record.title);
  const event = asString(record.event) || asString(record.purpose);
  if (!id || !title || !event) return null;
  return {
    id,
    title,
    scene: asString(record.scene) || '未标明',
    event,
    hook: asString(record.hook) || event,
  };
}

function mergeNarrationIntoWrite(data: unknown, bible: unknown): unknown {
  const write = asRecord(data);
  const source = asRecord(bible);
  if (!write || !source) return data;
  const next = { ...write };
  if (next.tense !== 'past' && next.tense !== 'present') {
    if (source.tense === 'past' || source.tense === 'present') next.tense = source.tense;
  }
  const voice = asRecord(source.voiceFocus);
  if (voice) {
    const style = asRecord(next.styleSelections) ?? {};
    next.styleSelections = { ...voice, ...style };
  }
  return next;
}
