import { describe, expect, it } from 'vitest';
import { isSavableVolume, trimVolume, volumeToDraft, type VolumeDraft } from './utils';

const draft: VolumeDraft = {
  title: ' 南山 ',
  geography: ' 三山 ',
  conflict: ' 夺权 ',
  outcome: ' 白尾纹 ',
  targetChars: 200000,
};

describe('isSavableVolume', () => {
  it('标题、范围、冲突、结果和达标字数都有才可保存', () => {
    expect(isSavableVolume(draft)).toBe(true);
    expect(isSavableVolume({ ...draft, outcome: '  ' })).toBe(false);
    expect(isSavableVolume({ ...draft, targetChars: 1999 })).toBe(false);
    expect(isSavableVolume({ ...draft, targetChars: null })).toBe(false);
  });
});

describe('volumeToDraft', () => {
  it('没有本卷结果时补成空字符串', () => {
    expect(
      volumeToDraft({
        id: 'v1',
        title: '南山',
        geography: '三山',
        conflict: '夺权',
        targetChars: 2000,
      }),
    ).toMatchObject({ outcome: '' });
  });
});

describe('trimVolume', () => {
  it('去掉文本首尾空白', () => {
    expect(trimVolume('v1', draft)).toEqual({
      id: 'v1',
      title: '南山',
      geography: '三山',
      conflict: '夺权',
      outcome: '白尾纹',
      targetChars: 200000,
    });
  });

  it('字数不合法时不产出分卷', () => {
    expect(trimVolume('v1', { ...draft, targetChars: null })).toBeUndefined();
  });
});
