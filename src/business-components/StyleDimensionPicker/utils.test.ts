import { describe, expect, it } from 'vitest';
import { STYLE_DIMENSIONS } from './style-dimensions';
import type { StyleDimension, StyleDimensionKey } from './types';
import {
  applyDimensionSelection,
  formatStyleSelections,
  hasStyleSelection,
  parseStyleSelections,
  toggleStyleCardId,
} from './utils';

/** 互斥轴：人称（narrativeStance 第一组）。 */
const EXCLUSIVE_DIMENSION = 'narrativeStance';
const EXCLUSIVE_A = 'voice-first';
const EXCLUSIVE_B = 'voice-second';
const EXCLUSIVE_C = 'voice-third';

/** 可叠加轴：词汇（languageTexture 第二组）。 */
const STACKABLE_DIMENSION = 'languageTexture';
const STACKABLE_A = 'word-concrete';
const STACKABLE_B = 'word-verb-first';

/** 同维度、不同轴的另一张卡，用于验证同轴互斥不影响他轴。 */
const OTHER_CARD = 'understatement';

function dimensionOf(key: StyleDimensionKey): StyleDimension {
  const found = STYLE_DIMENSIONS.find((item) => item.key === key);
  if (!found) throw new Error(`卡片库里没有维度：${key}`);
  return found;
}

describe('toggleStyleCardId', () => {
  it('互斥轴上选第二张会顶掉同轴第一张', () => {
    const dimension = dimensionOf(EXCLUSIVE_DIMENSION);
    const afterFirst = toggleStyleCardId(dimension, [], EXCLUSIVE_A);
    expect(afterFirst).toEqual([EXCLUSIVE_A]);

    const afterSecond = toggleStyleCardId(dimension, afterFirst, EXCLUSIVE_B);
    expect(afterSecond).toEqual([EXCLUSIVE_B]);
  });

  it('互斥轴上再点已选的那张即取消', () => {
    const dimension = dimensionOf(EXCLUSIVE_DIMENSION);
    expect(toggleStyleCardId(dimension, [EXCLUSIVE_A], EXCLUSIVE_A)).toEqual([]);
  });

  it('互斥轴只影响同轴，不动其它轴的选择', () => {
    const dimension = dimensionOf(EXCLUSIVE_DIMENSION);
    const ids = toggleStyleCardId(dimension, [OTHER_CARD], EXCLUSIVE_C);
    expect(ids).toEqual([OTHER_CARD, EXCLUSIVE_C]);
  });

  it('可叠加轴上多张共存', () => {
    const dimension = dimensionOf(STACKABLE_DIMENSION);
    const ids = toggleStyleCardId(dimension, [STACKABLE_A], STACKABLE_B);
    expect(ids).toEqual([STACKABLE_A, STACKABLE_B]);
  });
});

describe('parseStyleSelections', () => {
  it('丢弃卡片库里不存在的 id 与非数组值', () => {
    expect(parseStyleSelections({ [EXCLUSIVE_DIMENSION]: ['not-a-card'] })).toEqual({});
    expect(parseStyleSelections({ [EXCLUSIVE_DIMENSION]: EXCLUSIVE_A })).toEqual({});
    expect(parseStyleSelections(null)).toEqual({});
  });

  it('互斥轴上的历史多选只保留首次出现的一张', () => {
    expect(
      parseStyleSelections({ [EXCLUSIVE_DIMENSION]: [EXCLUSIVE_B, EXCLUSIVE_A, EXCLUSIVE_C] }),
    ).toEqual({ [EXCLUSIVE_DIMENSION]: [EXCLUSIVE_B] });
  });

  it('可叠加轴上的多选原样保留并去重', () => {
    expect(
      parseStyleSelections({ [STACKABLE_DIMENSION]: [STACKABLE_B, STACKABLE_A, STACKABLE_B] }),
    ).toEqual({ [STACKABLE_DIMENSION]: [STACKABLE_B, STACKABLE_A] });
  });
});

describe('applyDimensionSelection', () => {
  it('空数组删键，并按库顺序重建键序', () => {
    const start = applyDimensionSelection({}, STACKABLE_DIMENSION, [STACKABLE_A]);
    const withNarrative = applyDimensionSelection(start, EXCLUSIVE_DIMENSION, [EXCLUSIVE_A]);
    expect(Object.keys(withNarrative)).toEqual([EXCLUSIVE_DIMENSION, STACKABLE_DIMENSION]);

    const cleared = applyDimensionSelection(withNarrative, EXCLUSIVE_DIMENSION, []);
    expect(Object.keys(cleared)).toEqual([STACKABLE_DIMENSION]);
  });
});

describe('formatStyleSelections', () => {
  it('按「维度：轴=标签」输出，同轴多张用「、」、跨轴用「；」', () => {
    const text = formatStyleSelections({
      [EXCLUSIVE_DIMENSION]: [EXCLUSIVE_C, OTHER_CARD],
      [STACKABLE_DIMENSION]: [STACKABLE_A, STACKABLE_B],
    });
    expect(text).toBe(
      ['叙事姿态：人称=第三人称；态度=低调陈述', '语言质地：词汇=具体名词、动词优先'].join('\n'),
    );
  });

  it('空维度不占行，且轴的先后与选中顺序无关', () => {
    const text = formatStyleSelections({ [EXCLUSIVE_DIMENSION]: [OTHER_CARD, EXCLUSIVE_C] });
    expect(text).toBe('叙事姿态：人称=第三人称；态度=低调陈述');
  });

  it('无选择时返回空串', () => {
    expect(formatStyleSelections({})).toBe('');
  });
});

describe('hasStyleSelection', () => {
  it('只有库里真实存在的 id 才算已选', () => {
    expect(hasStyleSelection({})).toBe(false);
    expect(hasStyleSelection({ [EXCLUSIVE_DIMENSION]: ['not-a-card'] })).toBe(false);
    expect(hasStyleSelection({ [EXCLUSIVE_DIMENSION]: [EXCLUSIVE_A] })).toBe(true);
  });
});
