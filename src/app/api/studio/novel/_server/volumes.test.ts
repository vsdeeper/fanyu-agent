import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type {
  NovelCast,
  NovelPlan,
  NovelSection,
  NovelTopicCard,
  NovelVolumeDesign,
} from '../_shared/types';
import { parseVolumeChaptersBody, parseVolumesBody } from './parse-request';
import { buildVolumeChaptersPrompt, buildVolumesPrompt } from './prompt';

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

const worldview: NovelSection[] = [
  { id: 'w1', title: '县城', blocks: [{ title: '地图', body: '夏天，老院子' }] },
];

const plan: NovelPlan = {
  sections: [{ id: 's1', title: '县城', blocks: [{ title: '核心冲突', body: '家里人不肯说' }] }],
};

const volume: NovelVolumeDesign = {
  id: 'vol-1',
  title: '第一卷 停电之夜',
  sourceSectionId: 's1',
  conflict: '家里人不肯说',
  hook: '信被说开',
  beats: [
    { id: 'beat-1', title: '停电', event: '灯灭了，一家人在院子里坐下', characterIds: ['c1'] },
    { id: 'beat-2', title: '旧信', event: '信被翻出来，没有人认', characterIds: [] },
  ],
};

const sibling: NovelVolumeDesign = {
  id: 'vol-2',
  title: '第二卷 进城',
  conflict: '信被抢走',
  hook: '门外还有人',
  beats: [{ id: 'beat-3', title: '车站', event: '上了车', characterIds: [] }],
};

describe('parseVolumesBody', () => {
  it('世界观章节、选题、方案、角色与每卷字数都要', () => {
    expect(parseVolumesBody({ worldview, topic, plan, cast, volumeChars: 120000 })).toMatchObject({
      topic,
      volumeChars: 120000,
    });
    expect(parseVolumesBody({ worldview, topic, plan, cast })).toBeNull();
    expect(parseVolumesBody({ worldview, topic, plan, cast, volumeChars: 50000 })).toBeNull();
    expect(parseVolumesBody({ worldview, topic, plan, cast, volumeChars: 400000 })).toBeNull();
    expect(parseVolumesBody({ worldview, topic, plan })).toBeNull();
    expect(parseVolumesBody({ worldview, topic, cast })).toBeNull();
  });
});

describe('parseVolumeChaptersBody', () => {
  it('只认点选的那一卷，其余卷可选', () => {
    expect(parseVolumeChaptersBody({ worldview, topic, plan, cast, volume })?.volume).toEqual(
      volume,
    );
    expect(
      parseVolumeChaptersBody({ worldview, topic, plan, cast, volume, siblingVolumes: [sibling] })
        ?.siblingVolumes,
    ).toEqual([sibling]);
    expect(parseVolumeChaptersBody({ worldview, topic, plan, cast })).toBeNull();
    expect(
      parseVolumeChaptersBody({ worldview, topic, plan, cast, volume: { title: '没有 id' } }),
    ).toBeNull();
  });
});

describe('buildVolumesPrompt', () => {
  it('带上世界观章节、方案、角色与选题，并要求叙事卷', () => {
    const prompt = buildVolumesPrompt({ worldview, topic, plan, cast, volumeChars: 120000 });
    expect(prompt).toContain('【世界观章节】');
    expect(prompt).toContain('【创作方案】');
    expect(prompt).toContain('【角色设定】');
    expect(prompt).toContain('- c1｜李夏｜主角｜女｜');
    expect(prompt).toContain(
      'characterIds 必须原样照抄角色设定行首的 id，不要改写、不要去掉下划线',
    );
    expect(prompt).toContain('选定选题：停电之夜');
    expect(prompt).toContain('volumes JSON');
  });

  it('收束句写请求里的每卷字数与折出的章数，并要求把方案的事件铺成节拍', () => {
    const prompt = buildVolumesPrompt({ worldview, topic, plan, cast, volumeChars: 200000 });
    expect(prompt).toContain('每卷大约字数：200000（约 50 章，单章约 4000 字）');
    expect(prompt).toContain('每一卷按这个字数把方案在这一卷写明的事件铺成按时间的节拍');
    expect(prompt).toContain('不要把方案的一块收成一句');
  });
});

describe('buildVolumeChaptersPrompt', () => {
  it('本卷节拍按时间列出，角色 id 换成姓名', () => {
    const prompt = buildVolumeChaptersPrompt({
      worldview,
      topic,
      plan,
      cast,
      volume,
      siblingVolumes: [sibling],
    });
    expect(prompt).toContain('## [vol-1] 第一卷 停电之夜');
    expect(prompt).toContain('1. [beat-1] 停电（李夏）：灯灭了，一家人在院子里坐下');
    expect(prompt).toContain('2. [beat-2] 旧信：信被翻出来，没有人认');
    expect(prompt.indexOf('[beat-1]')).toBeLessThan(prompt.indexOf('[beat-2]'));
    expect(prompt).toContain('同书其它卷');
    expect(prompt).toContain('第二卷 进城｜卷末钩子：门外还有人');
    expect(prompt).not.toContain('[beat-3]');
    expect(prompt).toContain('chapters JSON');
  });

  it('节拍角色 id 少了下划线时仍换成姓名', () => {
    const prompt = buildVolumeChaptersPrompt({
      worldview,
      topic,
      plan,
      cast: {
        characters: [{ ...cast.characters[0], id: 'jiang_xu', name: '姜墟' }],
        relations: [],
      },
      volume: {
        ...volume,
        beats: [{ id: 'beat-1', title: '停电', event: '灯灭了', characterIds: ['jiangxu'] }],
      },
    });
    expect(prompt).toContain('1. [beat-1] 停电（姜墟）：灯灭了');
  });

  it('没有其它卷时写明没有', () => {
    const prompt = buildVolumeChaptersPrompt({ worldview, topic, plan, cast, volume });
    expect(prompt).toContain('同书其它卷：无');
  });

  it('按节拍里的事拆章卡，不出现每卷字数', () => {
    const prompt = buildVolumeChaptersPrompt({
      worldview,
      topic,
      plan,
      cast,
      volume,
      siblingVolumes: [sibling],
    });
    expect(prompt).toContain('一件事写成一章或几章');
    expect(prompt).toContain('不要把一句结果拆成多章');
    expect(prompt).not.toContain('每卷大约字数');
    expect(prompt).not.toContain('铺满');
  });
});
