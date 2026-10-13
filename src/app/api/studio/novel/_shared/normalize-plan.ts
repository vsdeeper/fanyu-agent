import type {
  NovelPlan,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
} from './types';

/** 没有世界观时用的空对象。 */
export function emptyWorldview(): NovelWorldview {
  return { orders: [], hiddenTruth: '', assets: [] };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function fallbackId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function parseEntry(value: unknown, index: number): NovelWorldEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = asString(record.name) ?? '';
  const rule = asString(record.rule) ?? '';
  if (!name && !rule) return null;
  return { id: asString(record.id) || fallbackId('entry', index), name, rule };
}

function parseOrder(value: unknown, index: number): NovelWorldOrder | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = asString(record.name) ?? '';
  const question = asString(record.question) ?? '';
  const entries = Array.isArray(record.entries)
    ? record.entries.map(parseEntry).filter((entry): entry is NovelWorldEntry => entry !== null)
    : [];
  if (!name && !question && entries.length === 0) return null;
  return { id: asString(record.id) || fallbackId('order', index), name, question, entries };
}

function parseAssetGroup(value: unknown, index: number): NovelWorldAssetGroup | null {
  const record = asRecord(value);
  if (!record) return null;
  const category = asString(record.category) ?? '';
  const items = Array.isArray(record.items)
    ? record.items.map(asString).filter((item): item is string => Boolean(item))
    : [];
  if (!category && items.length === 0) return null;
  return { id: asString(record.id) || fallbackId('asset', index), category, items };
}

/** 读取世界观。缺块或形状不对时返回空对象，不让旧快照打不开。 */
export function parseWorldview(value: unknown): NovelWorldview {
  const record = asRecord(value);
  if (!record) return emptyWorldview();
  const orders = Array.isArray(record.orders)
    ? record.orders.map(parseOrder).filter((order): order is NovelWorldOrder => order !== null)
    : [];
  const assets = Array.isArray(record.assets)
    ? record.assets
        .map(parseAssetGroup)
        .filter((group): group is NovelWorldAssetGroup => group !== null)
    : [];
  return { orders, hiddenTruth: asString(record.hiddenTruth) ?? '', assets };
}

function parseVolumeAssets(value: unknown): NovelVolumeAsset[] {
  if (!Array.isArray(value)) return [];
  const assets: NovelVolumeAsset[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const name = asString(record.name);
    const use = asString(record.use);
    if (!name || !use) continue;
    assets.push({ name, use });
  }
  return assets;
}

/**
 * 收成一卷。
 * 旧快照把卷末状态写在 outcome；没有钩子时用调用方传入的推进文本补上。
 */
export function normalizeVolumeOutline(
  value: unknown,
  advanceHook = '',
): NovelVolumeOutline | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const title = asString(record.title);
  const geography = asString(record.geography) || asString(record.purpose);
  const conflict = asString(record.conflict) || asString(record.purpose);
  const targetChars =
    typeof record.targetChars === 'number' && record.targetChars > 0
      ? Math.round(record.targetChars)
      : undefined;
  if (!id || !title || !geography || !conflict || !targetChars) return null;
  const hook = asString(record.hook) || asString(record.outcome) || advanceHook.trim();
  return {
    id,
    title,
    geography,
    conflict,
    relations: asString(record.relations) ?? '',
    assets: parseVolumeAssets(record.assets),
    hook,
    targetChars,
  };
}

function parseThread(value: unknown): NovelThread | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const name = asString(record.name);
  const core = asString(record.core);
  if (!id || !name || !core) return null;
  return { id, name, core };
}

/** 旧主线上某一卷的推进，按卷收成文本。主线本身不再保留逐卷字段。 */
function advanceHooks(threads: unknown[]): Map<string, string> {
  const grouped = new Map<string, string[]>();
  for (const thread of threads) {
    const record = asRecord(thread);
    if (!record || !Array.isArray(record.advances)) continue;
    for (const advance of record.advances) {
      const item = asRecord(advance);
      if (!item) continue;
      const volumeId = asString(item.volumeId);
      const text = asString(item.text);
      if (!volumeId || !text) continue;
      const list = grouped.get(volumeId) ?? [];
      list.push(text);
      grouped.set(volumeId, list);
    }
  }
  return new Map([...grouped].map(([volumeId, texts]) => [volumeId, texts.join('\n')]));
}

/**
 * 把模型输出或旧快照收成创作方案。
 * 没有世界观时补空对象。旧的本卷结果写入钩子；这一卷还没有钩子时，把各条主线在该卷的推进拼进去。
 */
export function normalizeNovelPlan(value: unknown): NovelPlan | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.threads) || !Array.isArray(record.volumes)) return null;
  const threads = record.threads
    .map(parseThread)
    .filter((thread): thread is NovelThread => thread !== null);
  if (threads.length === 0) return null;
  const hooks = advanceHooks(record.threads);
  const volumes = record.volumes
    .map((volume) => {
      const id = asString(asRecord(volume)?.id);
      return normalizeVolumeOutline(volume, id ? (hooks.get(id) ?? '') : '');
    })
    .filter((volume): volume is NovelVolumeOutline => volume !== null);
  if (volumes.length === 0) return null;
  return {
    worldview: parseWorldview(record.worldview),
    threads,
    ending: asString(record.ending) ?? '',
    theme: asString(record.theme) ?? '',
    volumes,
  };
}
