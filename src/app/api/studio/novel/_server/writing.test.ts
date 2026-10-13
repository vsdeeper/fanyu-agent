import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { NovelCast, NovelPlan, NovelTopicCard, NovelWritingRequest } from '../_shared/types';
import { parseWritingBody } from './parse-request';
import { buildWritingPrompt } from './prompt';

const topic: NovelTopicCard = {
  id: 'topic-1',
  title: '停电之夜',
  genreVolume: '现实 · 网文长篇',
  why: '人物关系集中',
  core: '一家人在停电夜说出旧事',
};

const cast: NovelCast = {
  characters: [
    {
      id: 'c1',
      name: '李夏',
      role: 'protagonist',
      gender: 'female',
      origin: '供电所临时工',
      trait: '不肯把话说完',
    },
  ],
  relations: [],
};

const plan: NovelPlan = {
  worldview: { orders: [], hiddenTruth: '信是父亲写的', assets: [] },
  threads: [{ id: 't1', name: '旧信', core: '一封没寄出的信' }],
  ending: '信被说开',
  theme: '隐瞒比停电更黑',
  volumes: [
    {
      id: 'v1',
      title: '县城',
      geography: '九十年代县城',
      conflict: '家里人不肯说',
      relations: '终于对上话',
      assets: [],
      hook: '信被说开',
      targetChars: 20000,
    },
  ],
};

const writingBody: NovelWritingRequest = {
  unitId: 'ch-2',
  topic,
  plan,
  cast,
  tense: 'past',
  previousChapters: [
    {
      title: '钥匙',
      scene: '旧屋门口',
      event: '拿到钥匙',
      hook: '门锁响了一声',
      body: '门锁响了一声。这是此前章节的全文，不应被截断。',
    },
  ],
  chapter: {
    title: '旧址',
    scene: '旧屋客厅',
    event: '找到旧信',
    hook: '信上没有落款',
  },
  nextChapter: { title: '来客', hook: '陌生人登门' },
};

describe('parseWritingBody', () => {
  it('接受带此前全文和下一章边界的写作请求', () => {
    expect(parseWritingBody(writingBody)).toEqual(writingBody);
  });

  it('旧方案里的逐卷推进和本卷结果仍能解析', () => {
    const parsed = parseWritingBody({
      ...writingBody,
      plan: {
        threads: [
          {
            id: 't1',
            name: '旧信',
            core: '一封没寄出的信',
            advances: [{ volumeId: 'v1', text: '信被找到' }],
          },
        ],
        volumes: [
          {
            id: 'v1',
            title: '县城',
            geography: '九十年代县城',
            conflict: '家里人不肯说',
            outcome: '信被说开',
            targetChars: 20000,
          },
        ],
      },
    });
    expect(parsed?.plan.threads[0]).toEqual({ id: 't1', name: '旧信', core: '一封没寄出的信' });
    expect(parsed?.plan.volumes[0]?.hook).toBe('信被说开');
    expect(parsed?.plan.worldview).toEqual({ orders: [], hiddenTruth: '', assets: [] });
  });

  it('拒绝缺场景的当前章', () => {
    expect(
      parseWritingBody({
        ...writingBody,
        chapter: { title: '旧址', scene: '', event: '找到旧信', hook: '信上没有落款' },
      }),
    ).toBeNull();
  });
});

describe('buildWritingPrompt', () => {
  it('带上完整方案、此前全文，以及下一章的标题和钩子', () => {
    const prompt = buildWritingPrompt(writingBody);
    expect(prompt).toContain('【创作方案】');
    expect(prompt).toContain('【角色设定】');
    expect(prompt).toContain('门锁响了一声。这是此前章节的全文，不应被截断。');
    expect(prompt).toContain('【下一章边界】');
    expect(prompt).toContain('钩子：陌生人登门');
    expect(prompt).not.toContain('【体系设定】');
    expect(prompt).not.toContain('节拍');
  });
});
