import { describe, expect, it } from 'vitest';
import type {
  ChaptersSnapshot,
  NovelPlan,
  NovelVolumeDesign,
  VolumesStepSnapshot,
  WritingSnapshot,
} from './types';
import {
  canGenerateWritingUnit,
  isFreshPlanComplete,
  isPlanReady,
  isSelectedVolumeReady,
  isSelectedVolumeReadyForChapters,
  isVolumesReady,
  parseCastPayload,
  parsePlanPayload,
  parseVolumesPayload,
  parseVolumeChaptersPayload,
  readChaptersStepSnapshot,
  readResearchStepSnapshot,
  readVolumesStepSnapshot,
  readWorldviewStepSnapshot,
  resolveGenerateUnitIds,
  resolveInitialPhase,
  resolveWorldviewSections,
  resolveWritingUnit,
  selectedVolume,
  selectedVolumeChapters,
  syncWritingUnits,
  toggleWritingSelection,
  visibleWritingChapters,
  volumeHasBody,
  writingStyleOnly,
} from './utils';

const plan: NovelPlan = {
  sections: [
    { id: 'v1', title: '县城', blocks: [{ title: '核心冲突', body: '家里人不说' }] },
    { id: 'v2', title: '城里', blocks: [{ title: '核心冲突', body: '信被抢走' }] },
  ],
};

const volumes: NovelVolumeDesign[] = [
  {
    id: 'v1',
    title: '县城',
    conflict: '家里人不说',
    hook: '信被说开',
    beats: [{ id: 'b1', title: '停电', event: '灯灭了', characterIds: ['c1'] }],
  },
  {
    id: 'v2',
    title: '城里',
    conflict: '信被抢走',
    hook: '门外还有人',
    beats: [{ id: 'b2', title: '进城', event: '上了车', characterIds: [] }],
  },
];

const volumesSnapshot: VolumesStepSnapshot = { volumes, selectedVolumeId: 'v1' };

const chapters: ChaptersSnapshot = {
  volumes: [
    {
      id: 'v1',
      chapters: [
        { id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '有人敲门' },
        { id: 'ch-2', title: '旧信', scene: '堂屋', event: '找到信', hook: '没有落款' },
      ],
    },
    {
      id: 'v2',
      chapters: [{ id: 'ch-3', title: '进城', scene: '车站', event: '上了车', hook: '信不在身上' }],
    },
  ],
};

describe('selectedVolume', () => {
  it('按快照里点选的卷取卷纲，未点选或对不上时为 undefined', () => {
    expect(selectedVolume(volumesSnapshot)?.id).toBe('v1');
    expect(selectedVolume({ volumes })?.id).toBeUndefined();
    expect(selectedVolume({ volumes, selectedVolumeId: 'missing' })?.id).toBeUndefined();
  });
});

describe('selectedVolumeChapters', () => {
  it('只取选中卷的章卡', () => {
    expect(selectedVolumeChapters(volumesSnapshot, chapters).map((chapter) => chapter.id)).toEqual([
      'ch-1',
      'ch-2',
    ]);
    expect(selectedVolumeChapters({ volumes }, chapters)).toEqual([]);
  });
});

describe('isSelectedVolumeReady', () => {
  it('选中卷要有章卡', () => {
    expect(isSelectedVolumeReady(volumesSnapshot, chapters)).toBe(true);
    expect(isSelectedVolumeReady({ volumes, selectedVolumeId: 'v3' }, chapters)).toBe(false);
    expect(isSelectedVolumeReady(volumesSnapshot, undefined)).toBe(false);
  });
});

describe('isSelectedVolumeReadyForChapters', () => {
  it('点选的那一卷要有节拍', () => {
    expect(isSelectedVolumeReadyForChapters(volumesSnapshot)).toBe(true);
    expect(isSelectedVolumeReadyForChapters({ volumes })).toBe(false);
    expect(
      isSelectedVolumeReadyForChapters({
        volumes: [{ ...volumes[0]!, beats: [] }],
        selectedVolumeId: 'v1',
      }),
    ).toBe(false);
  });
});

describe('isVolumesReady', () => {
  it('至少一卷写了标题或节拍', () => {
    expect(isVolumesReady(volumesSnapshot)).toBe(true);
    expect(isVolumesReady({ volumes: [] })).toBe(false);
    expect(
      isVolumesReady({ volumes: [{ id: 'v1', title: '', conflict: '', hook: '', beats: [] }] }),
    ).toBe(false);
  });
});

describe('volumeHasBody', () => {
  it('按卷看正文，换卷写作不会串到别的卷', () => {
    const writing: WritingSnapshot = {
      units: [
        { unitId: 'ch-1', body: '第一段' },
        { unitId: 'ch-3', body: '' },
      ],
    };
    expect(volumeHasBody('v1', chapters, writing)).toBe(true);
    expect(volumeHasBody('v2', chapters, writing)).toBe(false);
    expect(volumeHasBody('v1', chapters, undefined)).toBe(false);
  });
});

describe('visibleWritingChapters', () => {
  it('只列选中卷的章，序号按卷内从 1 开始', () => {
    expect(visibleWritingChapters(volumesSnapshot, chapters)).toMatchObject([
      { chapter: { id: 'ch-1' }, number: 1 },
      { chapter: { id: 'ch-2' }, number: 2 },
    ]);
    expect(visibleWritingChapters({ volumes, selectedVolumeId: 'v2' }, chapters)).toMatchObject([
      { chapter: { id: 'ch-3' }, number: 1 },
    ]);
  });
});

describe('syncWritingUnits', () => {
  it('全书各卷的章卡都收进正文，换卷不丢别的卷', () => {
    const prev: WritingSnapshot = {
      units: [
        { unitId: 'ch-1', body: '第一段' },
        { unitId: 'gone', body: '旧正文' },
      ],
      selectedUnitIds: ['gone'],
    };
    const synced = syncWritingUnits(chapters, prev);
    expect(synced.units).toEqual([
      { unitId: 'ch-1', body: '第一段' },
      { unitId: 'ch-2', body: '' },
      { unitId: 'ch-3', body: '' },
    ]);
    expect(synced.selectedUnitIds).toBeUndefined();
  });

  it('卷纲重排后只留文风，正文和选中章节丢掉', () => {
    expect(
      writingStyleOnly({
        units: [{ unitId: 'ch-1', body: '第一段' }],
        styleSelections: { narrativeStance: ['first-person'] },
        selectedUnitIds: ['ch-1'],
        focusUnitId: 'ch-1',
      }),
    ).toEqual({
      units: [],
      styleSelections: { narrativeStance: ['first-person'] },
    });
    expect(writingStyleOnly({ units: [{ unitId: 'ch-1', body: '第一段' }] })).toBeUndefined();
  });
});

describe('toggleWritingSelection', () => {
  it('始终单选', () => {
    expect(toggleWritingSelection(['ch-1', 'ch-2'], [], 'ch-1')).toEqual(['ch-1']);
    expect(toggleWritingSelection(['ch-1', 'ch-2'], ['ch-1'], 'ch-2')).toEqual(['ch-2']);
    expect(toggleWritingSelection(['ch-1', 'ch-2'], ['ch-1'], 'ch-1')).toEqual([]);
  });
});

describe('resolveGenerateUnitIds', () => {
  it('只保留仍存在的选中章节', () => {
    expect(resolveGenerateUnitIds(['ch-1'], ['missing', 'ch-1', 'ch-1'])).toEqual(['ch-1']);
  });
});

describe('canGenerateWritingUnit', () => {
  const writing: WritingSnapshot = {
    units: [
      { unitId: 'ch-1', body: '' },
      { unitId: 'ch-2', body: '' },
      { unitId: 'ch-3', body: '' },
    ],
  };

  it('新章节必须等本卷内前面章节都有正文', () => {
    expect(canGenerateWritingUnit(volumesSnapshot, chapters, writing, 'ch-1')).toBe(true);
    expect(canGenerateWritingUnit(volumesSnapshot, chapters, writing, 'ch-2')).toBe(false);
    expect(
      canGenerateWritingUnit(
        volumesSnapshot,
        chapters,
        {
          units: [
            { unitId: 'ch-1', body: '写完了' },
            { unitId: 'ch-2', body: '' },
            { unitId: 'ch-3', body: '' },
          ],
        },
        'ch-2',
      ),
    ).toBe(true);
  });

  it('后一卷的第一章不要求前一卷写完', () => {
    const later: VolumesStepSnapshot = { volumes, selectedVolumeId: 'v2' };
    expect(canGenerateWritingUnit(later, chapters, writing, 'ch-3')).toBe(true);
    expect(resolveWritingUnit(later, chapters, 'ch-3')).toMatchObject({
      label: '第一章　进城',
      previous: [],
    });
    expect(resolveWritingUnit(later, chapters, 'ch-1')).toBeUndefined();
  });
});

describe('parseCastPayload', () => {
  it('把旧的身份、欲望、缺陷映射到出身和特质', () => {
    const parsed = parseCastPayload({
      characters: [
        {
          id: 'c1',
          name: '李夏',
          role: 'protagonist',
          gender: 'female',
          identity: '临时工',
          desire: '保住工作',
          flaw: '不肯说完',
        },
      ],
      relations: [],
    });
    expect(parsed?.characters[0]).toMatchObject({
      origin: '临时工',
      trait: '保住工作；不肯说完',
    });
  });
});

describe('parsePlanPayload', () => {
  it('读两级章节，没有章节时返回空', () => {
    expect(parsePlanPayload(plan)?.sections).toEqual(plan.sections);
    expect(parsePlanPayload({ sections: [] })).toBeNull();
    expect(parsePlanPayload({ threads: [], volumes: [] })).toBeNull();
  });

  it('旧方案的分卷收成一级标题，主线与终局留在方案上', () => {
    const parsed = parsePlanPayload({
      threads: [
        {
          id: 't1',
          name: '旧信',
          core: '一封信',
          advances: [{ volumeId: 'v1', text: '信出现' }],
        },
      ],
      volumes: [
        {
          id: 'v1',
          title: '县城',
          geography: '夏天',
          conflict: '不说',
          outcome: '话说开了',
          targetChars: 10000,
        },
      ],
    });
    expect(parsed?.sections.map((section) => section.id)).toEqual(['v1']);
    expect(parsed?.sections[0]?.blocks.find((block) => block.title === '卷末钩子')?.body).toBe(
      '话说开了',
    );
    expect(parsed?.threads?.[0]).toEqual({ id: 't1', name: '旧信', core: '一封信' });
  });
});

describe('parseVolumesPayload', () => {
  it('读出卷与节拍，丢掉整卷空白与对不上的 sourceSectionId', () => {
    const parsed = parseVolumesPayload(
      {
        volumes: [
          {
            id: 'vol-1',
            title: '第一卷',
            sourceSectionId: 'v1',
            conflict: '不说',
            hook: '信被说开',
            beats: [
              { id: 'beat-1', title: '停电', event: '灯灭了', characterIds: ['c1', 'c1'] },
              { id: 'beat-2', title: '', event: '', characterIds: [] },
            ],
          },
          { id: 'vol-2' },
          { title: '没有 id' },
        ],
      },
      plan,
    );
    expect(parsed.map((volume) => volume.id)).toEqual(['vol-1']);
    expect(parsed[0]?.sourceSectionId).toBe('v1');
    expect(parsed[0]?.beats).toEqual([
      { id: 'beat-1', title: '停电', event: '灯灭了', characterIds: ['c1'] },
    ]);
  });

  it('角色 id 少了下划线时收成角色表里的 id', () => {
    const parsed = parseVolumesPayload(
      {
        volumes: [
          {
            id: 'vol-1',
            title: '南山血羽',
            beats: [
              {
                id: 'beat-1',
                title: '招摇山吞牲牲',
                event: '祭血',
                characterIds: ['jiangxu', 'qingli', 'jiangxu'],
              },
            ],
          },
        ],
      },
      undefined,
      [
        { id: 'jiang_xu', name: '姜墟' },
        { id: 'qing_li', name: '青黎' },
      ],
    );
    expect(parsed[0]?.beats[0]?.characterIds).toEqual(['jiang_xu', 'qing_li']);
  });

  it('sourceSectionId 对不上方案节时丢掉', () => {
    const parsed = parseVolumesPayload(
      { volumes: [{ id: 'vol-1', title: '第一卷', sourceSectionId: 'missing' }] },
      plan,
    );
    expect(parsed[0]).not.toHaveProperty('sourceSectionId');
  });
});

describe('parseVolumeChaptersPayload', () => {
  it('没有场景的章不收入', () => {
    expect(
      parseVolumeChaptersPayload({
        chapters: [
          { id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '有人敲门' },
          { id: 'ch-2', title: '旧信', purpose: '找到信' },
        ],
      }).map((chapter) => chapter.id),
    ).toEqual(['ch-1']);
  });
});

describe('readVolumesStepSnapshot', () => {
  it('读出卷与点选的那一卷，点选卷已不在卷纲里时丢掉', () => {
    const snapshot = readVolumesStepSnapshot({
      volumes,
      selectedVolumeId: 'v2',
      streamText: '取舍说明',
    });
    expect(snapshot?.volumes.map((volume) => volume.id)).toEqual(['v1', 'v2']);
    expect(snapshot?.selectedVolumeId).toBe('v2');
    expect(snapshot?.streamText).toBe('取舍说明');
    expect(readVolumesStepSnapshot({ volumes, selectedVolumeId: 'missing' })).toEqual({ volumes });
    expect(readVolumesStepSnapshot({})).toBeUndefined();
  });
});

describe('readChaptersStepSnapshot', () => {
  it('按卷读出章卡，没有章卡的卷丢掉', () => {
    const snapshot = readChaptersStepSnapshot({
      volumes: [
        { id: 'v1', chapters: [{ id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了' }] },
        { id: 'v2', chapters: [] },
      ],
    });
    expect(snapshot?.volumes).toEqual([
      {
        id: 'v1',
        chapters: [{ id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '灯灭了' }],
      },
    ]);
    expect(readChaptersStepSnapshot({})).toBeUndefined();
  });
});

describe('readWorldviewStepSnapshot', () => {
  it('读出章节、附件与思考强度，全空时返回 undefined', () => {
    const snapshot = readWorldviewStepSnapshot({
      sections: [{ id: 'w1', title: '县城', blocks: [{ title: '地图', body: '夏天' }] }],
      files: [{ name: '大纲.txt', previewUrl: '/api/studio/novel/tasks/t1/assets/a1' }],
      reasoningEffort: 'low',
    });
    expect(snapshot?.sections[0]?.title).toBe('县城');
    expect(snapshot?.files?.[0]?.name).toBe('大纲.txt');
    expect(snapshot?.reasoningEffort).toBe('low');
    expect(readWorldviewStepSnapshot({})).toBeUndefined();
  });

  it('旧快照没写思考强度时留 undefined，交给更旧的步骤兜底', () => {
    const snapshot = readWorldviewStepSnapshot({
      sections: [{ id: 'w1', title: '县城', blocks: [{ title: '地图', body: '夏天' }] }],
    });
    expect(snapshot).not.toHaveProperty('reasoningEffort');
  });
});

describe('resolveWorldviewSections', () => {
  it('优先用世界观步骤的结果，旧任务退回旧方案里的世界观', () => {
    const own = [{ id: 'w1', title: '县城', blocks: [{ title: '地图', body: '夏天' }] }];
    expect(resolveWorldviewSections({ sections: own }, plan)).toEqual(own);
    const legacyPlan: NovelPlan = {
      ...plan,
      worldview: {
        orders: [
          {
            id: 'o1',
            name: '县城',
            question: '谁把旧事说完',
            entries: [{ id: 'e1', name: '家里人', rule: '先修灯' }],
          },
        ],
        hiddenTruth: '信是父亲写的',
        assets: [],
      },
    };
    expect(resolveWorldviewSections(undefined, legacyPlan).map((section) => section.id)).toEqual([
      'o1',
      'hidden-truth',
    ]);
    expect(resolveWorldviewSections(undefined, plan)).toEqual([]);
  });
});

describe('isPlanReady', () => {
  it('至少一节写了正文才算可进入下一步', () => {
    expect(isPlanReady(plan)).toBe(true);
    expect(isPlanReady({ sections: [{ id: 's1', title: '县城', blocks: [] }] })).toBe(false);
    expect(isPlanReady({ sections: [] })).toBe(false);
    expect(isPlanReady(undefined)).toBe(false);
    expect(isFreshPlanComplete(plan)).toBe(true);
    expect(
      isFreshPlanComplete({
        sections: [{ id: 's1', title: '县城', blocks: [{ title: '冲突', body: '   ' }] }],
      }),
    ).toBe(false);
  });
});

describe('readResearchStepSnapshot', () => {
  it('旧的附件读成世界观设定，忽略旧的体量和赛道', () => {
    const snapshot = readResearchStepSnapshot({
      idea: '停电',
      ideaFiles: [{ name: '大纲.txt', previewUrl: '/api/studio/novel/tasks/t1/assets/a1' }],
      genres: ['现实'],
      volume: 'long',
      longFormat: 'web',
      topics: [
        {
          id: 't1',
          title: '停电之夜',
          genreVolume: '现实 · 网文长篇',
          why: '集中',
          core: '说出旧事',
        },
      ],
      reasoningEffort: 'max',
    });
    expect(snapshot).not.toHaveProperty('volume');
    expect(snapshot?.worldviewFiles?.[0]?.name).toBe('大纲.txt');
    expect(snapshot?.topics).toHaveLength(1);
  });

  it('每卷字数：记下的照读，缺的或越界的回落默认值', () => {
    const base = { genres: [], topics: [], reasoningEffort: 'max' as const };
    expect(readResearchStepSnapshot({ ...base, volumeChars: 90000 })?.volumeChars).toBe(90000);
    expect(readResearchStepSnapshot(base)?.volumeChars).toBe(120000);
    expect(readResearchStepSnapshot({ ...base, volumeChars: 70000 })?.volumeChars).toBe(120000);
    expect(readResearchStepSnapshot({ ...base, volumeChars: '120000' })?.volumeChars).toBe(120000);
  });
});

describe('resolveInitialPhase', () => {
  it('没有卷纲时停在最远的前置步骤', () => {
    expect(resolveInitialPhase({})).toBe('worldview');
    expect(
      resolveInitialPhase({
        cast: {
          characters: [
            {
              id: 'c1',
              name: '李夏',
              role: 'protagonist',
              gender: 'female',
              origin: '临时工',
              trait: '不肯说完',
            },
          ],
          relations: [],
        },
        plan,
      }),
    ).toBe('casted');
  });

  it('有卷纲但没点选时停在卷纲', () => {
    expect(resolveInitialPhase({ volumes: { volumes } })).toBe('volumed');
  });

  it('点选的那一卷有章卡停在卷章，有正文停在写作', () => {
    expect(resolveInitialPhase({ volumes: volumesSnapshot, chapters })).toBe('chaptered');
    expect(
      resolveInitialPhase({
        volumes: volumesSnapshot,
        chapters,
        writing: { units: [{ unitId: 'ch-1', body: '写完了' }] },
      }),
    ).toBe('written');
  });

  it('点选的那一卷还没有章卡，停在卷纲完成态', () => {
    const onlyFirstVolume: ChaptersSnapshot = { volumes: [chapters.volumes[0]!] };
    expect(
      resolveInitialPhase({
        volumes: { volumes, selectedVolumeId: 'v2' },
        chapters: onlyFirstVolume,
      }),
    ).toBe('volumed');
  });
});
