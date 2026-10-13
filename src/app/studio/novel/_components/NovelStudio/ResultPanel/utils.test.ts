import { describe, expect, it } from 'vitest';
import type { CastStepSnapshot, ChaptersSnapshot, PlanStepSnapshot } from '../types';
import {
  buildCastMarkdown,
  buildChaptersMarkdown,
  buildPlanMarkdown,
  parseCastMarkdownImport,
  parseChaptersMarkdownImport,
  parsePlanMarkdownImport,
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
  relations: [
    {
      fromId: 'c1',
      toId: 'c2',
      label: '瞒着',
      arc: { early: '躲开', late: '把信交给他' },
    },
  ],
};

const plan: PlanStepSnapshot = {
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
    assets: [{ id: 'a1', category: '信件', items: ['旧信'] }],
  },
  threads: [{ id: 't1', name: '旧信', core: '一封没寄出的信' }],
  ending: '信被说开',
  theme: '隐瞒比停电更黑',
  volumes: [
    {
      id: 'v1',
      title: '县城',
      geography: '夏天',
      conflict: '家里人不说',
      relations: '终于对上话',
      assets: [{ name: '旧信', use: '被找到' }],
      hook: '信被说开',
      targetChars: 10000,
    },
  ],
};

const chapters: ChaptersSnapshot = {
  volumes: [
    {
      id: 'v1',
      chapters: [{ id: 'ch-1', title: '停电', scene: '院子', event: '灯灭了', hook: '有人敲门' }],
    },
  ],
};

describe('markdown import', () => {
  it('角色、方案、卷章都能从自己导出的文件读回', () => {
    expect(parseCastMarkdownImport(buildCastMarkdown(cast))).toEqual({ ok: true, data: cast });
    expect(parsePlanMarkdownImport(buildPlanMarkdown(plan))).toEqual({ ok: true, data: plan });
    expect(parseChaptersMarkdownImport(buildChaptersMarkdown(plan, chapters))).toEqual({
      ok: true,
      data: chapters,
    });
  });

  it('类型不对时拒绝', () => {
    expect(parsePlanMarkdownImport(buildCastMarkdown(cast))).toEqual({
      ok: false,
      error: 'wrong-type',
    });
  });
});
