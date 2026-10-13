import { describe, expect, it } from 'vitest';
import type { ChaptersSnapshot, NovelPlan, WritingSnapshot } from './types';
import {
  canGenerateWritingUnit,
  isFreshPlanComplete,
  isPlanReady,
  isSelectedVolumeReadyForWrite,
  listStructureChapters,
  parseCastPayload,
  parsePlanPayload,
  parseVolumeChaptersPayload,
  readChaptersStepSnapshot,
  readResearchStepSnapshot,
  resolveWritingUnit,
  resolveGenerateUnitIds,
  resolveInitialPhase,
  syncWritingUnits,
  toggleWritingSelection,
} from './utils';

const plan: NovelPlan = {
  threads: [
    {
      id: 't1',
      name: '旧信',
      core: '一封没寄出的信',
      advances: [{ volumeId: 'v1', text: '信出现' }],
    },
  ],
  volumes: [
    { id: 'v1', title: '县城', geography: '夏天', conflict: '家里人不说', targetChars: 10000 },
    { id: 'v2', title: '城里', geography: '秋天', conflict: '信被抢走', targetChars: 10000 },
  ],
};

const chapters: ChaptersSnapshot = {
  volumes: [
    {
      id: 'v1',
      chapters: [
        { id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '有人敲门' },
        { id: 'ch-2', title: '旧信', scene: '堂屋', event: '找到信', hook: '没有落款' },
      ],
    },
  ],
};

describe('listStructureChapters', () => {
  it('按创作方案的卷序展开已有章卡', () => {
    expect(listStructureChapters(plan, chapters).map((chapter) => chapter.id)).toEqual([
      'ch-1',
      'ch-2',
    ]);
  });
});

describe('isSelectedVolumeReadyForWrite', () => {
  it('必须选中已经有章卡的卷', () => {
    expect(isSelectedVolumeReadyForWrite(plan, chapters)).toBe(false);
    expect(isSelectedVolumeReadyForWrite(plan, { ...chapters, selectedVolumeId: 'v2' })).toBe(
      false,
    );
    expect(isSelectedVolumeReadyForWrite(plan, { ...chapters, selectedVolumeId: 'v1' })).toBe(true);
  });
});

describe('readChaptersStepSnapshot', () => {
  it('保留仍存在的选中卷', () => {
    expect(
      readChaptersStepSnapshot({ ...chapters, selectedVolumeId: 'v1' })?.selectedVolumeId,
    ).toBe('v1');
    expect(
      readChaptersStepSnapshot({ ...chapters, selectedVolumeId: 'missing' })?.selectedVolumeId,
    ).toBeUndefined();
  });
});

describe('isPlanReady', () => {
  it('主线 2～4 条且每卷写了本卷结果才算可进入下一步', () => {
    const ready: NovelPlan = {
      threads: [
        plan.threads[0]!,
        {
          id: 't2',
          name: '敲门的人',
          core: '门外是谁',
          advances: [
            { volumeId: 'v1', text: '有人敲门' },
            { volumeId: 'v2', text: '人进了屋' },
          ],
        },
      ],
      volumes: plan.volumes.map((volume) => ({ ...volume, outcome: '话说开了' })),
    };
    expect(isPlanReady(ready)).toBe(true);
    expect(isPlanReady(plan)).toBe(false);
    expect(isFreshPlanComplete(plan)).toBe(false);
    expect(isFreshPlanComplete(ready)).toBe(true);
    expect(isPlanReady({ ...ready, threads: [{ ...ready.threads[0]!, advances: [] }] })).toBe(
      false,
    );
  });
});

describe('syncWritingUnits', () => {
  it('按章卡对齐正文，并丢掉已经不存在的章节', () => {
    const prev: WritingSnapshot = {
      units: [
        { unitId: 'ch-1', body: '第一段' },
        { unitId: 'gone', body: '旧正文' },
      ],
      selectedUnitIds: ['gone'],
    };
    const synced = syncWritingUnits(plan, chapters, prev);
    expect(synced.units).toEqual([
      { unitId: 'ch-1', body: '第一段' },
      { unitId: 'ch-2', body: '' },
    ]);
    expect(synced.selectedUnitIds).toBeUndefined();
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
    ],
  };

  it('新章节必须等前面章节都有正文', () => {
    expect(canGenerateWritingUnit(plan, chapters, writing, 'ch-1')).toBe(true);
    expect(canGenerateWritingUnit(plan, chapters, writing, 'ch-2')).toBe(false);
    expect(
      canGenerateWritingUnit(
        plan,
        chapters,
        {
          units: [
            { unitId: 'ch-1', body: '写完了' },
            { unitId: 'ch-2', body: '' },
          ],
        },
        'ch-2',
      ),
    ).toBe(true);
  });

  it('选中后一卷时，不要求前一卷已经写完', () => {
    const twoVolumes: ChaptersSnapshot = {
      volumes: [
        ...chapters.volumes,
        {
          id: 'v2',
          chapters: [
            { id: 'ch-3', title: '进城', scene: '车站', event: '上了车', hook: '信不在身上' },
          ],
        },
      ],
      selectedVolumeId: 'v2',
    };
    const later: WritingSnapshot = {
      units: [
        { unitId: 'ch-1', body: '' },
        { unitId: 'ch-2', body: '' },
        { unitId: 'ch-3', body: '' },
      ],
    };
    expect(canGenerateWritingUnit(plan, twoVolumes, later, 'ch-3')).toBe(true);
    expect(resolveWritingUnit(plan, twoVolumes, 'ch-3')).toMatchObject({
      label: '第三章　进城',
      previous: [],
    });
    expect(resolveWritingUnit(plan, twoVolumes, 'ch-1')).toBeUndefined();
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
  it('要求主线和分卷都在', () => {
    expect(parsePlanPayload(plan)?.volumes).toHaveLength(2);
    expect(parsePlanPayload(plan)?.volumes[0]?.outcome).toBe('');
    expect(parsePlanPayload({ threads: [], volumes: plan.volumes })).toBeNull();
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

describe('readResearchStepSnapshot', () => {
  it('忽略旧的体量和赛道', () => {
    const snapshot = readResearchStepSnapshot({
      idea: '停电',
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
    expect(snapshot?.topics).toHaveLength(1);
  });
});

describe('resolveInitialPhase', () => {
  it('停在最远的已有步骤', () => {
    expect(resolveInitialPhase({})).toBe('research');
    expect(
      resolveInitialPhase({
        research: {
          idea: '停电',
          genres: [],
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
        },
        plan: { ...plan },
      }),
    ).toBe('planned');
  });
});
