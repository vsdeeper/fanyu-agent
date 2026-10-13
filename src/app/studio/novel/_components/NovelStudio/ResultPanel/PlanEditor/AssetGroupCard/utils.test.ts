import { describe, expect, it } from 'vitest';
import {
  assetGroupToDraft,
  isSavableAssetGroup,
  trimAssetGroup,
  type AssetGroupDraft,
} from './utils';

const draft: AssetGroupDraft = {
  category: ' 军粮 ',
  itemsText: ' 祝馀\n\n鹿蜀 ',
};

describe('isSavableAssetGroup', () => {
  it('功能和至少一个要素名才可保存', () => {
    expect(isSavableAssetGroup(draft)).toBe(true);
    expect(isSavableAssetGroup({ ...draft, itemsText: ' \n ' })).toBe(false);
    expect(isSavableAssetGroup({ ...draft, category: ' ' })).toBe(false);
  });
});

describe('assetGroupToDraft', () => {
  it('要素名合成多行文本', () => {
    expect(assetGroupToDraft({ id: 'a1', category: '军粮', items: ['祝馀', '鹿蜀'] })).toEqual({
      category: '军粮',
      itemsText: '祝馀\n鹿蜀',
    });
  });
});

describe('trimAssetGroup', () => {
  it('去掉空行和首尾空白', () => {
    expect(trimAssetGroup('a1', draft)).toEqual({
      id: 'a1',
      category: '军粮',
      items: ['祝馀', '鹿蜀'],
    });
  });
});
