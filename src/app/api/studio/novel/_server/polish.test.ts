import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parsePolishBody } from './parse-request';
import { buildPolishPrompt } from './prompt';

describe('parsePolishBody', () => {
  it('接受整章正文，并带上章目的、完整节拍与文风', () => {
    expect(
      parsePolishBody({
        body: '舱盖上先化出一个点。',
        label: '第一章　苏醒',
        purpose: '让主角离开休眠舱',
        beats: [{ id: 'b1', text: '休眠舱解冻' }],
        stylePrompt: '叙事姿态：人称=第三人称',
      }),
    ).toEqual({
      body: '舱盖上先化出一个点。',
      label: '第一章　苏醒',
      purpose: '让主角离开休眠舱',
      beats: [{ id: 'b1', text: '休眠舱解冻' }],
      stylePrompt: '叙事姿态：人称=第三人称',
    });
  });

  it('空正文拒绝', () => {
    expect(parsePolishBody({ body: '   ' })).toBeNull();
  });
});

describe('buildPolishPrompt', () => {
  it('有完整节拍和文风时写进提示，并要求不改情节', () => {
    const prompt = buildPolishPrompt({
      body: '原文一段。',
      label: '第一章　苏醒',
      purpose: '主角离开休眠舱',
      beats: [{ id: 'b1', text: '舱盖化开' }],
      stylePrompt: '态度=低调陈述',
    });
    expect(prompt).toContain('【正文单元】\n第一章　苏醒');
    expect(prompt).toContain('【完整节拍】\n1. 舱盖化开');
    expect(prompt).toContain('【文风】\n态度=低调陈述');
    expect(prompt).toContain('【原文】\n原文一段。');
    expect(prompt).toContain('不改情节');
  });
});
