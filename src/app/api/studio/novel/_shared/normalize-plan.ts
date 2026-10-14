import type {
  NovelPlan,
  NovelSection,
  NovelSectionBlock,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
} from './types';

/** 没有世界观时用的空对象。旧方案里的世界观仍按这个形状读取。 */
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

/** 世界观里是否写了内容。全空时不再往下传。 */
function hasWorldviewContent(worldview: NovelWorldview): boolean {
  return (
    worldview.orders.length > 0 ||
    worldview.assets.length > 0 ||
    worldview.hiddenTruth.trim().length > 0
  );
}

/** 收一个二级块。标题与正文都空时丢掉。 */
function parseBlock(value: unknown): NovelSectionBlock | null {
  const record = asRecord(value);
  if (!record) return null;
  const title = asString(record.title) ?? '';
  const body = asString(record.body) ?? '';
  if (!title && !body) return null;
  return { title, body };
}

/** 收一节。标题与二级块都空时丢掉。 */
function parseSection(value: unknown, index: number): NovelSection | null {
  const record = asRecord(value);
  if (!record) return null;
  const title = asString(record.title) ?? '';
  const blocks = Array.isArray(record.blocks)
    ? record.blocks.map(parseBlock).filter((block): block is NovelSectionBlock => block !== null)
    : [];
  if (!title && blocks.length === 0) return null;
  return { id: asString(record.id) || fallbackId('sec', index), title, blocks };
}

/** 读取通用两级章节。缺块或形状不对时返回空数组。 */
export function parseSections(value: unknown): NovelSection[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseSection).filter((section): section is NovelSection => section !== null);
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

/** 旧分卷收成一节：卷的字段落进二级块，id 保持不变，已有章卡仍能对上。 */
function volumeToSection(volume: NovelVolumeOutline): NovelSection {
  const blocks: NovelSectionBlock[] = [
    { title: '地图', body: volume.geography },
    { title: '核心冲突', body: volume.conflict },
    { title: '人物推进', body: volume.relations },
    {
      title: '本卷要素',
      body: volume.assets.map((asset) => `${asset.name}：${asset.use}`).join('\n'),
    },
    { title: '卷末钩子', body: volume.hook },
    { title: '目标字数', body: String(volume.targetChars) },
  ].filter((block) => block.title.trim() && block.body.trim());
  return { id: volume.id, title: volume.title, blocks };
}

/** 读取旧方案的分卷，收成一级标题。 */
function parseLegacyVolumes(volumes: unknown, threads: unknown): NovelSection[] {
  if (!Array.isArray(volumes)) return [];
  const hooks = advanceHooks(Array.isArray(threads) ? threads : []);
  return volumes
    .map((volume) => {
      const id = asString(asRecord(volume)?.id);
      return normalizeVolumeOutline(volume, id ? (hooks.get(id) ?? '') : '');
    })
    .filter((volume): volume is NovelVolumeOutline => volume !== null)
    .map(volumeToSection);
}

/**
 * 旧方案里的世界观收成两级章节。
 * 世界观已有独立步骤，这里只给没有世界观步骤的旧任务补输入。
 */
export function worldviewToSections(worldview: NovelWorldview | undefined): NovelSection[] {
  if (!worldview) return [];
  const sections: NovelSection[] = worldview.orders.map((order) => ({
    id: order.id,
    title: order.name,
    blocks: [
      { title: order.question, body: order.entries.map((e) => `${e.name}：${e.rule}`).join('\n') },
    ],
  }));
  if (worldview.hiddenTruth.trim()) {
    sections.push({
      id: 'hidden-truth',
      title: '隐藏真相',
      blocks: [{ title: '隐藏真相', body: worldview.hiddenTruth }],
    });
  }
  if (worldview.assets.length > 0) {
    sections.push({
      id: 'world-assets',
      title: '物质基础',
      blocks: worldview.assets.map((group) => ({
        title: group.category,
        body: group.items.join('、'),
      })),
    });
  }
  return sections;
}

/**
 * 把模型输出或旧快照收成创作方案。
 * 旧方案的主线与终局原样留着，分卷收成一级标题；没有一级标题时整份方案当作没解析到。
 */
export function normalizeNovelPlan(value: unknown): NovelPlan | null {
  const record = asRecord(value);
  if (!record) return null;
  const legacyVolumes = parseLegacyVolumes(record.volumes, record.threads);
  const sections = parseSections(record.sections);
  const merged = sections.length > 0 ? sections : legacyVolumes;
  if (merged.length === 0) return null;
  const threads = Array.isArray(record.threads)
    ? record.threads.map(parseThread).filter((thread): thread is NovelThread => thread !== null)
    : [];
  const worldview = parseWorldview(record.worldview);
  const ending = asString(record.ending);
  const theme = asString(record.theme);
  return {
    sections: merged,
    ...(threads.length > 0 ? { threads } : {}),
    ...(ending ? { ending } : {}),
    ...(theme ? { theme } : {}),
    ...(hasWorldviewContent(worldview) ? { worldview } : {}),
  };
}
