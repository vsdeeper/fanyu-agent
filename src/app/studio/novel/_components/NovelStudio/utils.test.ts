import { describe, expect, it } from 'vitest';
import type { StructureSnapshot } from './types';
import {
  buildPreviewDocument,
  buildWritingEditorBlocks,
  canGenerateWriting,
  isChapterRowSelected,
  areVolumesReadyForWrite,
  listStructureChapters,
  resolveGenerateUnitIds,
  syncWritingUnits,
  toggleWritingSelection,
} from './utils';

const shortStructure: StructureSnapshot = {
  kind: 'short',
  synopsis: 's',
  beats: [
    { id: 'beat-1', text: 'a' },
    { id: 'beat-2', text: 'b' },
  ],
};

const chaptersStructure: StructureSnapshot = {
  kind: 'chapters',
  chapters: [
    {
      id: 'ch-1',
      title: '钥匙',
      purpose: 'p1',
      beats: [
        { id: 'ch-1-beat-1', text: 'b1' },
        { id: 'ch-1-beat-2', text: 'b2' },
      ],
    },
    {
      id: 'ch-2',
      title: '旧址',
      purpose: 'p2',
      beats: [{ id: 'ch-2-beat-1', text: 'c1' }],
    },
  ],
};

describe('syncWritingUnits', () => {
  it('对齐章与节拍 id 并保留旧正文', () => {
    const synced = syncWritingUnits(chaptersStructure, {
      kind: 'chapters',
      units: [{ unitId: 'ch-1', body: '旧章文' }],
    });
    expect(synced.units.map((unit) => unit.unitId)).toEqual([
      'ch-1',
      'ch-1-beat-1',
      'ch-1-beat-2',
      'ch-2',
      'ch-2-beat-1',
    ]);
    expect(synced.units.find((unit) => unit.unitId === 'ch-1')?.body).toBe('旧章文');
    expect(synced.units.find((unit) => unit.unitId === 'ch-2')?.body).toBe('');
  });
});

describe('toggleWritingSelection', () => {
  it('短篇节拍可多选', () => {
    expect(toggleWritingSelection(shortStructure, [], 'beat-1')).toEqual(['beat-1']);
    expect(toggleWritingSelection(shortStructure, ['beat-1'], 'beat-2')).toEqual([
      'beat-1',
      'beat-2',
    ]);
  });

  it('中长篇点章即全选有节拍的章；无节拍章不可选', () => {
    expect(toggleWritingSelection(chaptersStructure, [], 'ch-1')).toEqual([
      'ch-1',
      'ch-1-beat-1',
      'ch-1-beat-2',
    ]);
    expect(
      toggleWritingSelection(chaptersStructure, ['ch-1', 'ch-1-beat-1', 'ch-1-beat-2'], 'ch-1'),
    ).toEqual([]);
    expect(toggleWritingSelection(chaptersStructure, ['ch-1-beat-1'], 'ch-1-beat-2')).toEqual([
      'ch-1',
      'ch-1-beat-1',
      'ch-1-beat-2',
    ]);
    expect(
      toggleWritingSelection(
        chaptersStructure,
        ['ch-1', 'ch-1-beat-1', 'ch-1-beat-2'],
        'ch-1-beat-2',
      ),
    ).toEqual(['ch-1-beat-1']);
    expect(
      toggleWritingSelection(chaptersStructure, ['ch-1-beat-1', 'ch-1-beat-2'], 'ch-2-beat-1'),
    ).toEqual(['ch-2', 'ch-2-beat-1']);
  });

  it('无节拍的章点选无效', () => {
    const emptyBeats: StructureSnapshot = {
      kind: 'chapters',
      chapters: [{ id: 'ch-x', title: '空', purpose: 'p', beats: [] }],
    };
    expect(toggleWritingSelection(emptyBeats, [], 'ch-x')).toEqual([]);
  });
});

describe('isChapterRowSelected', () => {
  it('全选节拍时章行视为选中', () => {
    expect(
      isChapterRowSelected(chaptersStructure.chapters[0], ['ch-1-beat-1', 'ch-1-beat-2']),
    ).toBe(true);
    expect(isChapterRowSelected(chaptersStructure.chapters[0], ['ch-1-beat-1'])).toBe(false);
  });
});

describe('resolveGenerateUnitIds', () => {
  it('只生成节拍；选中整章时展开为该章节拍', () => {
    expect(
      resolveGenerateUnitIds(chaptersStructure, ['ch-1', 'ch-1-beat-1', 'ch-1-beat-2']),
    ).toEqual(['ch-1-beat-1', 'ch-1-beat-2']);
    expect(resolveGenerateUnitIds(chaptersStructure, ['ch-1'])).toEqual([
      'ch-1-beat-1',
      'ch-1-beat-2',
    ]);
    expect(
      resolveGenerateUnitIds(
        { kind: 'chapters', chapters: [{ id: 'ch-x', title: '空', purpose: 'p', beats: [] }] },
        ['ch-x'],
      ),
    ).toEqual([]);
  });
});

describe('canGenerateWriting', () => {
  it('无节拍时不可生成', () => {
    expect(canGenerateWriting(chaptersStructure, ['ch-1'])).toBe(true);
    expect(
      canGenerateWriting(
        { kind: 'chapters', chapters: [{ id: 'ch-x', title: '空', purpose: 'p', beats: [] }] },
        ['ch-x'],
      ),
    ).toBe(false);
  });
});

describe('buildWritingEditorBlocks', () => {
  it('节拍选中时嵌套展示章标题', () => {
    const writing = syncWritingUnits(chaptersStructure);
    const blocks = buildWritingEditorBlocks(chaptersStructure, writing, [
      'ch-1',
      'ch-1-beat-1',
      'ch-1-beat-2',
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'chapter',
      chapterLabel: '第一章　钥匙',
    });
    if (blocks[0].type === 'chapter') {
      expect(blocks[0].beats.map((beat) => beat.unitId)).toEqual(['ch-1-beat-1', 'ch-1-beat-2']);
    }
  });
});

describe('buildPreviewDocument', () => {
  it('短篇按节拍顺序拼接非空正文，无章标题', () => {
    const writing = syncWritingUnits(shortStructure, {
      kind: 'short',
      units: [
        { unitId: 'beat-1', body: '第一段' },
        { unitId: 'beat-2', body: '  ' },
      ],
    });
    const doc = buildPreviewDocument(shortStructure, writing);
    expect(doc.sections).toEqual([{ paragraphs: ['第一段'] }]);
    expect(doc.plainText).toBe('第一段');
  });

  it('中长篇按章分隔，跳过无正文的章与节拍', () => {
    const writing = syncWritingUnits(chaptersStructure, {
      kind: 'chapters',
      units: [
        { unitId: 'ch-1-beat-1', body: '钥匙开了' },
        { unitId: 'ch-1-beat-2', body: '门后无人' },
        { unitId: 'ch-2-beat-1', body: '' },
      ],
    });
    const doc = buildPreviewDocument(chaptersStructure, writing);
    expect(doc.sections).toEqual([
      {
        chapterLabel: '第一章　钥匙',
        paragraphs: ['钥匙开了', '门后无人'],
      },
    ]);
    expect(doc.plainText).toBe('第一章　钥匙\n\n钥匙开了\n\n门后无人');
  });
});

describe('volumes helpers', () => {
  const volumesStructure: StructureSnapshot = {
    kind: 'volumes',
    volumes: [
      {
        id: 'vol-1',
        title: '上卷',
        purpose: '起',
        chapters: [
          {
            id: 'ch-1',
            title: '钥匙',
            purpose: 'p1',
            beats: [{ id: 'ch-1-beat-1', text: 'b1' }],
          },
        ],
      },
      {
        id: 'vol-2',
        title: '下卷',
        purpose: '收',
        chapters: [],
      },
    ],
  };

  it('flatten 跨卷章列表；写作 kind 为 chapters', () => {
    expect(listStructureChapters(volumesStructure).map((ch) => ch.id)).toEqual(['ch-1']);
    expect(syncWritingUnits(volumesStructure).kind).toBe('chapters');
  });

  it('至少一卷有章纲即可进入写作', () => {
    expect(areVolumesReadyForWrite(volumesStructure)).toBe(true);
    expect(
      areVolumesReadyForWrite({
        ...volumesStructure,
        volumes: volumesStructure.volumes.map((vol) => ({ ...vol, chapters: [] })),
      }),
    ).toBe(false);
  });
});
