import { describe, expect, it } from 'vitest';
import { SHORT_WRITING_UNIT_ID } from './constants';
import type { BibleStepSnapshot, StructureSnapshot } from './types';
import {
  buildPreviewDocument,
  buildWritingEditorBlocks,
  canGenerateWriting,
  canGenerateWritingUnit,
  hasBibleDraft,
  isBibleReadyForStructure,
  isChapterRowSelected,
  areVolumesReadyForWrite,
  listStructureChapters,
  parseBiblePayload,
  resolveGenerateUnitIds,
  expandedChapterIds,
  isSameWriteSnapshot,
  readResearchStepSnapshot,
  retainWritingSelection,
  syncWritingUnits,
  toBibleRequest,
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
  it('仅保留章节 id，并优先保留旧整章正文', () => {
    const synced = syncWritingUnits(chaptersStructure, {
      kind: 'chapters',
      units: [{ unitId: 'ch-1', body: '旧章文' }],
    });
    expect(synced.units.map((unit) => unit.unitId)).toEqual(['ch-1', 'ch-2']);
    expect(synced.units.find((unit) => unit.unitId === 'ch-1')?.body).toBe('旧章文');
    expect(synced.units.find((unit) => unit.unitId === 'ch-2')?.body).toBe('');
  });

  it('把旧节拍正文与选中无损迁移到所属章节', () => {
    const synced = syncWritingUnits(chaptersStructure, {
      kind: 'chapters',
      units: [
        { unitId: 'ch-1-beat-1', body: '第一段' },
        { unitId: 'ch-1-beat-2', body: '第二段' },
      ],
      selectedUnitIds: ['ch-1-beat-1', 'gone'],
      focusUnitId: 'ch-1-beat-1',
    });
    expect(synced.units[0]?.body).toBe('第一段\n\n第二段');
    expect(synced.selectedUnitIds).toEqual(['ch-1']);
    expect(synced.focusUnitId).toBe('ch-1');
    expect(retainWritingSelection(chaptersStructure, ['gone'], 'gone')).toEqual({});
  });

  it('把短篇旧节拍正文合并为唯一整篇单元', () => {
    const synced = syncWritingUnits(shortStructure, {
      kind: 'short',
      units: [
        { unitId: 'beat-1', body: '开头' },
        { unitId: 'beat-2', body: '结尾' },
      ],
      selectedUnitIds: ['beat-2'],
    });
    expect(synced.units).toEqual([{ unitId: SHORT_WRITING_UNIT_ID, body: '开头\n\n结尾' }]);
    expect(synced.selectedUnitIds).toEqual([SHORT_WRITING_UNIT_ID]);
  });
});

describe('isSameWriteSnapshot', () => {
  const base = {
    kind: 'chapters' as const,
    units: [{ unitId: 'ch-1-beat-1', body: '正文' }],
    selectedUnitIds: ['ch-1-beat-1'],
    focusUnitId: 'ch-1-beat-1',
  };

  it('选中或正文变化才算变更；空选中与缺省相同', () => {
    expect(isSameWriteSnapshot(base, { ...base })).toBe(true);
    expect(isSameWriteSnapshot(base, { ...base, selectedUnitIds: undefined })).toBe(false);
    expect(
      isSameWriteSnapshot(
        { kind: 'chapters', units: [] },
        { kind: 'chapters', units: [], selectedUnitIds: [] },
      ),
    ).toBe(true);
    expect(
      isSameWriteSnapshot(base, { ...base, units: [{ unitId: 'ch-1-beat-1', body: '改' }] }),
    ).toBe(false);
    expect(isSameWriteSnapshot(undefined, undefined)).toBe(true);
  });
});

describe('expandedChapterIds', () => {
  it('仅展开当前选中章', () => {
    expect(expandedChapterIds(chaptersStructure, ['ch-1-beat-2'])).toEqual([]);
    expect(expandedChapterIds(chaptersStructure, ['ch-2'])).toEqual(['ch-2']);
    expect(expandedChapterIds(shortStructure, [SHORT_WRITING_UNIT_ID])).toEqual([]);
  });
});

describe('toggleWritingSelection', () => {
  it('短篇只有整篇可选', () => {
    expect(toggleWritingSelection(shortStructure, [], SHORT_WRITING_UNIT_ID)).toEqual([
      SHORT_WRITING_UNIT_ID,
    ]);
    expect(toggleWritingSelection(shortStructure, [], 'beat-1')).toEqual([]);
  });

  it('中长篇章节始终单选，节拍点击无效', () => {
    expect(toggleWritingSelection(chaptersStructure, [], 'ch-1')).toEqual(['ch-1']);
    expect(toggleWritingSelection(chaptersStructure, ['ch-1'], 'ch-2')).toEqual(['ch-2']);
    expect(toggleWritingSelection(chaptersStructure, ['ch-1'], 'ch-1-beat-1')).toEqual(['ch-1']);
  });
});

describe('isChapterRowSelected', () => {
  it('只认章节 id，不继承节拍选中态', () => {
    expect(isChapterRowSelected(chaptersStructure.chapters[0], ['ch-1'])).toBe(true);
    expect(isChapterRowSelected(chaptersStructure.chapters[0], ['ch-1-beat-1'])).toBe(false);
  });
});

describe('resolveGenerateUnitIds', () => {
  it('保留有效整篇或章节 id，不展开节拍', () => {
    expect(resolveGenerateUnitIds(chaptersStructure, ['ch-1', 'ch-1-beat-1'])).toEqual(['ch-1']);
    expect(resolveGenerateUnitIds(shortStructure, [SHORT_WRITING_UNIT_ID, 'beat-1'])).toEqual([
      SHORT_WRITING_UNIT_ID,
    ]);
  });
});

describe('canGenerateWriting', () => {
  it('所选整篇或章节有节拍时才可生成', () => {
    expect(canGenerateWriting(chaptersStructure, ['ch-1'])).toBe(true);
    expect(
      canGenerateWriting(
        { kind: 'chapters', chapters: [{ id: 'ch-x', title: '空', purpose: 'p', beats: [] }] },
        ['ch-x'],
      ),
    ).toBe(false);
  });
});

describe('canGenerateWritingUnit', () => {
  it('新章节只能按顺序生成，已有正文允许重生成', () => {
    const empty = syncWritingUnits(chaptersStructure);
    expect(canGenerateWritingUnit(chaptersStructure, empty, 'ch-1')).toBe(true);
    expect(canGenerateWritingUnit(chaptersStructure, empty, 'ch-2')).toBe(false);

    const firstDone = {
      ...empty,
      units: empty.units.map((unit) =>
        unit.unitId === 'ch-1' ? { ...unit, body: '第一章正文' } : unit,
      ),
    };
    expect(canGenerateWritingUnit(chaptersStructure, firstDone, 'ch-2')).toBe(true);
    expect(canGenerateWritingUnit(chaptersStructure, firstDone, 'ch-1')).toBe(true);
  });
});

describe('buildWritingEditorBlocks', () => {
  it('只构建一个整章正文块', () => {
    const writing = syncWritingUnits(chaptersStructure);
    const blocks = buildWritingEditorBlocks(chaptersStructure, writing, ['ch-1']);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'chapter',
      unitId: 'ch-1',
      label: '第一章　钥匙',
      canGenerate: true,
    });
  });
});

describe('buildPreviewDocument', () => {
  it('短篇读取整篇正文，无章标题', () => {
    const writing = syncWritingUnits(shortStructure, {
      kind: 'short',
      units: [{ unitId: SHORT_WRITING_UNIT_ID, body: '第一段\n\n第二段' }],
    });
    const doc = buildPreviewDocument(shortStructure, writing);
    expect(doc.sections).toEqual([{ paragraphs: ['第一段\n\n第二段'] }]);
    expect(doc.plainText).toBe('第一段\n\n第二段');
  });

  it('中长篇按整章分隔，跳过无正文的章', () => {
    const writing = syncWritingUnits(chaptersStructure, {
      kind: 'chapters',
      units: [
        { unitId: 'ch-1', body: '钥匙开了\n\n门后无人' },
        { unitId: 'ch-2', body: '' },
      ],
    });
    const doc = buildPreviewDocument(chaptersStructure, writing);
    expect(doc.sections).toEqual([
      {
        chapterLabel: '第一章　钥匙',
        paragraphs: ['钥匙开了\n\n门后无人'],
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
        chapters: [
          {
            id: 'ch-2',
            title: '旧址',
            purpose: 'p2',
            beats: [{ id: 'ch-2-beat-1', text: 'b2' }],
          },
        ],
      },
    ],
  };

  it('flatten 跨卷章列表；写作 kind 为 chapters', () => {
    expect(listStructureChapters(volumesStructure).map((ch) => ch.id)).toEqual(['ch-1', 'ch-2']);
    expect(syncWritingUnits(volumesStructure).kind).toBe('chapters');
  });

  it('章节生成顺序跨卷连续', () => {
    const writing = syncWritingUnits(volumesStructure);
    expect(canGenerateWritingUnit(volumesStructure, writing, 'ch-2')).toBe(false);
    const firstDone = {
      ...writing,
      units: writing.units.map((unit) =>
        unit.unitId === 'ch-1' ? { ...unit, body: '上卷正文' } : unit,
      ),
    };
    expect(canGenerateWritingUnit(volumesStructure, firstDone, 'ch-2')).toBe(true);
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

const readyBible: BibleStepSnapshot = {
  characters: [
    {
      id: 'c1',
      name: '李夏',
      role: 'protagonist',
      gender: 'female',
      identity: '供电所临时工',
      desire: '保住这个夏天',
      flaw: '不肯把话说完',
    },
  ],
  relations: [{ fromId: 'c1', toId: 'missing', label: '瞒着' }],
  timePlace: '九十年代的县城',
  rules: ['夜里常常停电'],
  taboos: [],
  voiceFocus: { narrativeStance: ['voice-first', 'internal-focus'] },
  tense: 'past',
};

describe('parseBiblePayload', () => {
  it('收下核心人物并丢掉指向不存在人物的关系', () => {
    const parsed = parseBiblePayload({
      characters: [
        {
          id: 'c1',
          name: '李夏',
          role: '主角',
          gender: '女',
          identity: '临时工',
          desire: '留下',
          flaw: '嘴硬',
        },
      ],
      relations: [
        { fromId: 'c1', toId: 'c1', label: '自责' },
        { fromId: 'c1', toId: 'nope', label: '瞒着' },
      ],
      timePlace: '县城的夏天',
      rules: ['停电'],
      taboos: [],
    });
    expect(parsed?.characters[0]?.role).toBe('protagonist');
    expect(parsed?.characters[0]?.gender).toBe('female');
    expect(parsed?.relations).toEqual([]);
    expect(parsed?.timePlace).toBe('县城的夏天');
  });

  it('没有人物或时空时返回空', () => {
    expect(parseBiblePayload({ characters: [], timePlace: '某地' })).toBeNull();
    expect(
      parseBiblePayload({
        characters: [
          {
            id: 'c1',
            name: '李夏',
            role: 'protagonist',
            gender: '不标明',
            identity: '工',
            desire: '留',
            flaw: '硬',
          },
        ],
      }),
    ).toBeNull();
  });
});

describe('hasBibleDraft', () => {
  it('只有人称和时态时仍视为未生成设定', () => {
    expect(
      hasBibleDraft({
        characters: [],
        relations: [],
        timePlace: '',
        rules: [],
        taboos: [],
        voiceFocus: { narrativeStance: ['voice-first'] },
        tense: 'past',
      }),
    ).toBe(false);
    expect(hasBibleDraft(readyBible)).toBe(true);
  });
});

describe('isBibleReadyForStructure', () => {
  it('人称、聚焦、时态和写全的人物都在时才放行', () => {
    expect(isBibleReadyForStructure(readyBible)).toBe(true);
    expect(
      isBibleReadyForStructure({
        ...readyBible,
        characters: [{ ...readyBible.characters[0]!, flaw: '' }],
      }),
    ).toBe(true);
    expect(isBibleReadyForStructure({ ...readyBible, tense: undefined })).toBe(false);
    expect(isBibleReadyForStructure({ ...readyBible, voiceFocus: {} })).toBe(false);
    expect(
      isBibleReadyForStructure({
        ...readyBible,
        characters: [{ ...readyBible.characters[0]!, gender: undefined }],
      }),
    ).toBe(false);
  });
});

describe('readResearchStepSnapshot', () => {
  it('只有思路文件时仍能读回', () => {
    const snapshot = readResearchStepSnapshot({
      idea: '',
      ideaFiles: [
        {
          uid: 'file-1',
          previewUrl: 'data:text/plain;base64,YQ==',
          name: '大纲.txt',
          mimeType: 'text/plain',
          size: 1,
        },
      ],
      volume: 'short',
    });
    expect(snapshot?.idea).toBe('');
    expect(snapshot?.ideaFiles?.[0]?.name).toBe('大纲.txt');
    expect(snapshot?.reasoningEffort).toBe('max');
  });

  it('读回左栏思考强度；只有强度时也保留', () => {
    expect(
      readResearchStepSnapshot({
        idea: '',
        reasoningEffort: 'low',
        volume: 'long',
      })?.reasoningEffort,
    ).toBe('low');
    expect(readResearchStepSnapshot({ idea: '', volume: 'short' })).toBeUndefined();
  });

  it('读回服务端落盘后的资产地址', () => {
    const snapshot = readResearchStepSnapshot({
      idea: '将按山经划分的势力转为国名',
      ideaFiles: [
        {
          uid: 'file-1',
          previewUrl: '/api/studio/novel/tasks/task-1/assets/asset-1',
          name: '势力体系设定.md',
          mimeType: 'text/markdown',
          size: 29720,
        },
      ],
      volume: 'short',
    });
    expect(snapshot?.ideaFiles).toEqual([
      {
        uid: 'file-1',
        previewUrl: '/api/studio/novel/tasks/task-1/assets/asset-1',
        name: '势力体系设定.md',
        mimeType: 'text/markdown',
        size: 29720,
      },
    ]);
  });

  it('最多读回三份思路文件，并跳过 blob', () => {
    const file = (uid: string, previewUrl: string) => ({
      uid,
      previewUrl,
      name: `${uid}.md`,
    });
    const snapshot = readResearchStepSnapshot({
      idea: '',
      ideaFiles: [
        file('a', '/api/studio/novel/tasks/t/assets/a'),
        file('b', 'data:text/plain;base64,YQ=='),
        file('c', 'blob:http://local/1'),
        file('d', '/api/studio/novel/tasks/t/assets/d'),
        file('e', '/api/studio/novel/tasks/t/assets/e'),
      ],
      volume: 'short',
    });
    expect(snapshot?.ideaFiles?.map((item) => item.uid)).toEqual(['a', 'b', 'd']);
  });

  it('丢掉刷新后失效的 blob 地址；想法、文件、选题都没有则无效', () => {
    expect(
      readResearchStepSnapshot({
        idea: '',
        ideaFiles: [{ uid: 'file-1', previewUrl: 'blob:http://local/1', name: '大纲.txt' }],
      }),
    ).toBeUndefined();
    expect(
      readResearchStepSnapshot({ idea: '院子', volume: 'long', longFormat: 'web' })?.idea,
    ).toBe('院子');
  });
});

describe('toBibleRequest', () => {
  it('人称聚焦压进 voicePrompt，并丢掉悬空关系', () => {
    const request = toBibleRequest(readyBible);
    expect(request?.voicePrompt).toContain('人称=第一人称');
    expect(request?.voicePrompt).toContain('聚焦=内聚焦');
    expect(request?.relations).toEqual([]);
    expect(request?.tense).toBe('past');
    expect(request?.characters[0]?.gender).toBe('female');
  });
});
