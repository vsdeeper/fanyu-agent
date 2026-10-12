import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { NovelBible, NovelTopicCard } from '../_shared/types';
import { parseChapterBeatsBody } from './parse-request';
import { buildChapterBeatsPrompt } from './prompt';

const topic: NovelTopicCard = {
  id: 'topic-1',
  title: '绝地天通',
  genreVolume: '神话探险 · 网文长篇',
  why: '登天有代价',
  core: '人自己决定人间需不需要天',
};

const bible: NovelBible = {
  characters: [
    {
      id: 'c1',
      name: '子游',
      role: 'protagonist',
      gender: 'male',
      identity: '互人国末裔',
      desire: '找出登天的答案',
      flaw: '以为自己还记得',
    },
  ],
  relations: [],
  timePlace: '绝地天通之后',
  rules: ['每一次登天都永久折损记忆或寿数'],
  taboos: [],
  tense: 'past',
  voicePrompt: '人称=第三人称；聚焦=内聚焦',
};

const chapter = { id: 'v01-02', title: '上下于天', purpose: '第一次登天，失去灭国夜的记忆' };

describe('buildChapterBeatsPrompt', () => {
  it('首章不带上一章，并保留同书章纲', () => {
    const prompt = buildChapterBeatsPrompt({
      topic,
      bible,
      chapter: { id: 'v01-01', title: '掌心的炎纹', purpose: '立下无籍与炎纹' },
      siblingChapters: [{ id: 'v01-02', title: '上下于天', purpose: '第一次登天' }],
    });

    expect(prompt).toContain('【上一章衔接】无（这是首章）');
    expect(prompt).not.toContain('【下一章边界】');
    expect(prompt).toContain('[v01-02] 上下于天：第一次登天');
    expect(prompt).toContain('不作为本章开场');
  });

  it('有前章时列入全部节拍和正文结尾，后章只作边界', () => {
    const prompt = buildChapterBeatsPrompt({
      topic,
      bible,
      longFormat: 'web',
      chapter,
      previousChapter: {
        title: '掌心的炎纹',
        purpose: '立下无籍与炎纹',
        beats: [{ id: 'v01-01-b5', text: '他在岩下决定登一次天' }],
        ending: '要把这条路走下去，就得登一次天。',
      },
      nextChapter: { title: '灵山十巫的最后一个', purpose: '巫罗离开灵山' },
      siblingChapters: [
        { id: 'v01-01', title: '掌心的炎纹', purpose: '立下无籍与炎纹' },
        { id: 'v01-03', title: '灵山十巫的最后一个', purpose: '巫罗离开灵山' },
      ],
    });

    expect(prompt).toContain('【上一章衔接】');
    expect(prompt).toContain('1. 他在岩下决定登一次天');
    expect(prompt).toContain('正文结尾（现场以此为准）：');
    expect(prompt).toContain('要把这条路走下去，就得登一次天。');
    expect(prompt).toContain('【下一章边界】');
    expect(prompt).toContain('巫罗离开灵山');
    expect(prompt).toContain('【同书其它章纲】');
    expect(prompt.indexOf('【上一章衔接】')).toBeLessThan(prompt.indexOf('【当前章】'));
    expect(prompt.indexOf('【当前章】')).toBeLessThan(prompt.indexOf('【下一章边界】'));
    expect(prompt.indexOf('【下一章边界】')).toBeLessThan(prompt.indexOf('【同书其它章纲】'));
  });
});

describe('parseChapterBeatsBody', () => {
  it('接受前章上下文，并拒绝超长正文结尾', () => {
    expect(
      parseChapterBeatsBody({
        topic,
        bible,
        chapter,
        previousChapter: {
          title: '掌心的炎纹',
          purpose: '立下无籍与炎纹',
          beats: [{ id: 'b1', text: '岩下决定登天' }],
          ending: '登一次天。',
        },
        nextChapter: { title: '灵山', purpose: '巫罗下山' },
        siblingChapters: [{ id: 'v01-03', title: '灵山', purpose: '巫罗下山' }],
      }),
    ).toMatchObject({ chapter, previousChapter: { ending: '登一次天。' } });

    expect(
      parseChapterBeatsBody({
        topic,
        bible,
        chapter,
        previousChapter: {
          title: '掌心的炎纹',
          purpose: '立下无籍与炎纹',
          ending: '天'.repeat(3001),
        },
      }),
    ).toBeNull();
  });
});
