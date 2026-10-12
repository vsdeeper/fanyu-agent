import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { NovelBible, NovelTopicCard } from '../_shared/types';
import { parseWritingBody } from './parse-request';
import { buildWritingPrompt } from './prompt';

const topic: NovelTopicCard = {
  id: 'topic-1',
  title: '停电之夜',
  genreVolume: '现实 · 中篇',
  why: '人物关系集中',
  core: '一家人在停电夜说出旧事',
};

const bible: NovelBible = {
  characters: [
    {
      id: 'c1',
      name: '李夏',
      role: 'protagonist',
      gender: 'female',
      identity: '供电所临时工',
      desire: '保住工作',
      flaw: '不肯把话说完',
    },
  ],
  relations: [],
  timePlace: '九十年代县城',
  rules: ['夜里经常停电'],
  taboos: [],
  tense: 'past',
  voicePrompt: '人称=第三人称；聚焦=内聚焦',
};

describe('parseWritingBody', () => {
  it('接受短篇整篇请求', () => {
    const body = {
      scope: 'short',
      unitId: '__short_story__',
      synopsis: '一个停电夜改变一家人',
      beats: [{ id: 'b1', text: '灯灭了' }],
      topic,
      bible,
      volume: 'short',
    };
    expect(parseWritingBody(body)).toEqual(body);
  });

  it('接受带相邻章上下文的整章请求', () => {
    const body = {
      scope: 'chapter',
      unitId: 'ch-2',
      chapterTitle: '旧址',
      chapterPurpose: '找到旧信',
      beats: [{ id: 'b1', text: '李夏回到旧屋' }],
      previousChapter: { title: '钥匙', purpose: '拿到钥匙', ending: '门锁响了一声。' },
      nextChapter: { title: '来客', purpose: '陌生人登门' },
      topic,
      bible,
      volume: 'medium',
    };
    expect(parseWritingBody(body)).toEqual(body);
  });

  it('拒绝空节拍与 scope、volume 不匹配', () => {
    expect(
      parseWritingBody({
        scope: 'chapter',
        unitId: 'ch-1',
        chapterTitle: '钥匙',
        chapterPurpose: '拿到钥匙',
        beats: [],
        topic,
        bible,
        volume: 'medium',
      }),
    ).toBeNull();
    expect(
      parseWritingBody({
        scope: 'short',
        unitId: '__short_story__',
        synopsis: '梗概',
        beats: [{ id: 'b1', text: '开场' }],
        topic,
        bible,
        volume: 'long',
      }),
    ).toBeNull();
  });

  it('拒绝超过上限的上一章正文结尾', () => {
    expect(
      parseWritingBody({
        scope: 'chapter',
        unitId: 'ch-2',
        chapterTitle: '旧址',
        chapterPurpose: '找到旧信',
        beats: [{ id: 'b1', text: '回到旧屋' }],
        previousChapter: {
          title: '钥匙',
          purpose: '拿到钥匙',
          ending: '字'.repeat(3001),
        },
        topic,
        bible,
        volume: 'medium',
      }),
    ).toBeNull();
  });
});

describe('buildWritingPrompt', () => {
  it('整章提示包含全部节拍和相邻章边界', () => {
    const prompt = buildWritingPrompt({
      scope: 'chapter',
      unitId: 'ch-2',
      chapterTitle: '旧址',
      chapterPurpose: '找到旧信',
      beats: [
        { id: 'b1', text: '李夏回到旧屋' },
        { id: 'b2', text: '她发现信封' },
      ],
      previousChapter: { title: '钥匙', purpose: '拿到钥匙', ending: '门锁响了一声。' },
      nextChapter: { title: '来客', purpose: '陌生人登门' },
      topic,
      bible,
      volume: 'medium',
    });
    expect(prompt).toContain('1. 李夏回到旧屋');
    expect(prompt).toContain('2. 她发现信封');
    expect(prompt).toContain('正文结尾：\n门锁响了一声。');
    expect(prompt).toContain('当前章不要提前写掉下一章的核心任务');
    expect(prompt).toContain('自然段之间只换一行，不要留空白行');
    expect(prompt).not.toContain('请只写本节拍正文');
  });

  it('短篇提示要求一次写完整篇', () => {
    const prompt = buildWritingPrompt({
      scope: 'short',
      unitId: '__short_story__',
      synopsis: '一个停电夜改变一家人',
      beats: [{ id: 'b1', text: '灯灭了' }],
      topic,
      bible,
      volume: 'short',
    });
    expect(prompt).toContain('梗概：一个停电夜改变一家人');
    expect(prompt).toContain('请一次写完整篇正文');
    expect(prompt).toContain('自然段之间只换一行，不要留空白行');
  });
});
