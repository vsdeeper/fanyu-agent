import { describe, expect, it } from 'vitest';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  PlanStepSnapshot,
  VolumesStepSnapshot,
  WorldviewStepSnapshot,
} from '../types';
import {
  buildCastMarkdown,
  buildChaptersMarkdown,
  buildPlanMarkdown,
  buildVolumesMarkdown,
  buildWorldviewMarkdown,
  parseCastMarkdownImport,
  parseChaptersMarkdownImport,
  parsePlanMarkdownImport,
  parseVolumesMarkdownImport,
  parseWorldviewMarkdownImport,
} from './utils';

const cast: CastStepSnapshot = {
  characters: [
    {
      id: 'c1',
      name: '李夏',
      role: 'protagonist',
      gender: 'female',
      origin: '临时工',
      trait: '不肯说完',
      arc: { early: '隐瞒', end: '说出来' },
    },
    {
      id: 'c2',
      name: '父亲',
      role: 'supporting',
      gender: 'male',
      origin: '供电所',
      trait: '先把灯修好',
    },
  ],
  relations: [{ fromId: 'c1', toId: 'c2', label: '瞒着' }],
};

const worldview: WorldviewStepSnapshot = {
  sections: [
    {
      id: 'w1',
      title: '县城',
      blocks: [{ title: '谁把旧事说完', body: '家里人：先修灯，再说话' }],
    },
  ],
};

const plan: PlanStepSnapshot = {
  sections: [
    {
      id: 's1',
      title: '县城',
      blocks: [{ title: '核心冲突', body: '家里人不说，旧信被翻出来' }],
    },
  ],
  threads: [{ id: 't1', name: '旧信', core: '一封没寄出的信' }],
  ending: '信被说开',
  theme: '隐瞒比停电更黑',
};

const volumes: VolumesStepSnapshot = {
  volumes: [
    {
      id: 'vol-1',
      title: '县城',
      sourceSectionId: 's1',
      conflict: '家里人不说',
      hook: '信被说开',
      beats: [{ id: 'beat-1', title: '停电', event: '灯灭了', characterIds: ['c1'] }],
    },
  ],
  selectedVolumeId: 'vol-1',
};

const chapters: ChaptersSnapshot = {
  volumes: [
    {
      id: 'vol-1',
      chapters: [{ id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '有人敲门' }],
    },
  ],
};

describe('markdown import', () => {
  it('世界观、方案、角色、卷纲、卷章都能从自己导出的文件读回', () => {
    expect(parseWorldviewMarkdownImport(buildWorldviewMarkdown(worldview))).toEqual({
      ok: true,
      data: worldview,
    });
    expect(parseCastMarkdownImport(buildCastMarkdown(cast))).toEqual({ ok: true, data: cast });
    expect(parsePlanMarkdownImport(buildPlanMarkdown(plan))).toEqual({ ok: true, data: plan });
    expect(parseVolumesMarkdownImport(buildVolumesMarkdown(volumes))).toEqual({
      ok: true,
      data: volumes,
    });
    expect(parseChaptersMarkdownImport(buildChaptersMarkdown(volumes, chapters))).toEqual({
      ok: true,
      data: chapters,
    });
  });

  it('类型不对时拒绝', () => {
    expect(parsePlanMarkdownImport(buildCastMarkdown(cast))).toEqual({
      ok: false,
      error: 'wrong-type',
    });
    expect(parseVolumesMarkdownImport(buildPlanMarkdown(plan))).toEqual({
      ok: false,
      error: 'wrong-type',
    });
    expect(parseChaptersMarkdownImport(buildVolumesMarkdown(volumes))).toEqual({
      ok: false,
      error: 'wrong-type',
    });
  });
});
