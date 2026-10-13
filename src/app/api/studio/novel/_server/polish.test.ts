import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parsePolishBody } from './parse-request';
import { buildPolishPrompt } from './prompt';

describe('parsePolishBody', () => {
  it('接受整章正文，并带上场景、事件、钩子与文风', () => {
    expect(
      parsePolishBody({
        body: '舱盖上先化出一个点。',
        label: '第一章　苏醒',
        scene: '休眠舱',
        event: '主角离开休眠舱',
        hook: '舱外有人',
        stylePrompt: '叙事姿态：人称=第三人称',
      }),
    ).toEqual({
      body: '舱盖上先化出一个点。',
      label: '第一章　苏醒',
      scene: '休眠舱',
      event: '主角离开休眠舱',
      hook: '舱外有人',
      stylePrompt: '叙事姿态：人称=第三人称',
    });
  });

  it('空正文拒绝', () => {
    expect(parsePolishBody({ body: '   ' })).toBeNull();
  });
});

describe('buildPolishPrompt', () => {
  it('有场景、事件、钩子和文风时写进提示，并要求不改情节', () => {
    const prompt = buildPolishPrompt({
      body: '原文一段。',
      label: '第一章　苏醒',
      scene: '休眠舱',
      event: '主角离开休眠舱',
      hook: '舱外有人',
      stylePrompt: '态度=低调陈述',
    });
    expect(prompt).toContain('【正文单元】\n第一章　苏醒');
    expect(prompt).toContain('【场景】\n休眠舱');
    expect(prompt).toContain('【事件】\n主角离开休眠舱');
    expect(prompt).toContain('【钩子】\n舱外有人');
    expect(prompt).toContain('【文风】\n态度=低调陈述');
    expect(prompt).toContain('【原文】\n原文一段。');
    expect(prompt).toContain('不改情节');
    expect(prompt).toContain('自然段之间只换一行，不要留空白行');
    expect(prompt).not.toContain('节拍');
  });
});
