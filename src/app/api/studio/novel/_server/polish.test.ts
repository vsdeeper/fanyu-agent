import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parsePolishBody } from './parse-request';
import { buildPolishPrompt } from './prompt';

describe('parsePolishBody', () => {
  it('接受正文，并带上节拍与文风', () => {
    expect(
      parsePolishBody({
        body: '舱盖上先化出一个点。',
        beatText: '休眠舱解冻',
        stylePrompt: '叙事姿态：人称=第三人称',
      }),
    ).toEqual({
      body: '舱盖上先化出一个点。',
      beatText: '休眠舱解冻',
      stylePrompt: '叙事姿态：人称=第三人称',
    });
  });

  it('空正文拒绝', () => {
    expect(parsePolishBody({ body: '   ' })).toBeNull();
  });
});

describe('buildPolishPrompt', () => {
  it('有节拍和文风时写进提示，并要求不改情节', () => {
    const prompt = buildPolishPrompt({
      body: '原文一段。',
      beatText: '舱盖化开',
      stylePrompt: '态度=低调陈述',
    });
    expect(prompt).toContain('【节拍】\n舱盖化开');
    expect(prompt).toContain('【文风】\n态度=低调陈述');
    expect(prompt).toContain('【原文】\n原文一段。');
    expect(prompt).toContain('不改情节');
  });
});
