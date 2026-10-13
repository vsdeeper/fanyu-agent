import { describe, expect, it } from 'vitest';
import { isSavableVolume, trimVolume, volumeToDraft, type VolumeDraft } from './utils';

const draft: VolumeDraft = {
  title: ' 南山 ',
  geography: ' 三山 ',
  conflict: ' 夺权 ',
  relations: ' 两人结伴 ',
  assets: [{ name: ' 祝馀 ', use: ' 当军粮 ' }],
  hook: ' 尾骨上有字 ',
  targetChars: 200000,
};

describe('isSavableVolume', () => {
  it('标题、地图、冲突、人物推进、钩子和达标字数都有才可保存', () => {
    expect(isSavableVolume(draft)).toBe(true);
    expect(isSavableVolume({ ...draft, assets: [] })).toBe(true);
    expect(isSavableVolume({ ...draft, hook: '  ' })).toBe(false);
    expect(isSavableVolume({ ...draft, relations: '' })).toBe(false);
    expect(isSavableVolume({ ...draft, assets: [{ name: '祝馀', use: '  ' }] })).toBe(false);
    expect(isSavableVolume({ ...draft, targetChars: 1999 })).toBe(false);
    expect(isSavableVolume({ ...draft, targetChars: null })).toBe(false);
  });
});

describe('volumeToDraft', () => {
  it('把要素收成可编辑的行', () => {
    expect(
      volumeToDraft({
        id: 'v1',
        title: '南山',
        geography: '三山',
        conflict: '夺权',
        relations: '结伴',
        assets: [{ name: '祝馀', use: '军粮' }],
        hook: '有字',
        targetChars: 2000,
      }).assets,
    ).toEqual([{ name: '祝馀', use: '军粮' }]);
  });
});

describe('trimVolume', () => {
  it('去掉文本首尾空白，并丢掉空的要素行', () => {
    expect(
      trimVolume('v1', { ...draft, assets: [...draft.assets, { name: ' ', use: '' }] }),
    ).toEqual({
      id: 'v1',
      title: '南山',
      geography: '三山',
      conflict: '夺权',
      relations: '两人结伴',
      assets: [{ name: '祝馀', use: '当军粮' }],
      hook: '尾骨上有字',
      targetChars: 200000,
    });
  });

  it('字数不合法时不产出分卷', () => {
    expect(trimVolume('v1', { ...draft, targetChars: null })).toBeUndefined();
  });
});
