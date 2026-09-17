import { describe, expect, it } from 'vitest';
import { STYLE_DIMENSIONS } from './style-dimensions';
import {
  applyDimensionSelection,
  formatStyleSelections,
  hasStyleSelection,
  parseStyleSelections,
  readSoftTuneStepSnapshot,
  selectCardsByIds,
  toggleStyleCardId,
} from './utils';

const narrative = STYLE_DIMENSIONS[0]!;
const emotion = STYLE_DIMENSIONS[1]!;
/** 全维度卡片（跨分组），按库顺序。 */
const narrativeIds = narrative.groups.flatMap((group) => group.cards.map((card) => card.id));
/** 取前两张，用乱序传入以验证输出按库顺序。 */
const [firstId, secondId] = narrativeIds;

describe('卡片库', () => {
  it('卡片 id 全局唯一（文件头声明的约定，重名会让已选指向错卡）', () => {
    const ids = STYLE_DIMENSIONS.flatMap((dimension) =>
      dimension.groups.flatMap((group) => group.cards.map((card) => card.id)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每张卡片都有 tag（决定送进提示词的内容）', () => {
    for (const dimension of STYLE_DIMENSIONS) {
      for (const group of dimension.groups) {
        for (const card of group.cards) expect(card.tag.trim()).not.toBe('');
      }
    }
  });
});

describe('style selections', () => {
  it('toggle 增删', () => {
    expect(toggleStyleCardId([], 'a')).toEqual(['a']);
    expect(toggleStyleCardId(['a'], 'a')).toEqual([]);
  });

  it('空维度不落键，键序按库顺序', () => {
    let s = applyDimensionSelection({}, emotion.key, ['e1']);
    s = applyDimensionSelection(s, narrative.key, ['n1']);
    expect(Object.keys(s)).toEqual([narrative.key, emotion.key]);
    expect(applyDimensionSelection(s, emotion.key, [])).toEqual({ [narrative.key]: ['n1'] });
  });

  it('键序稳定，同一逻辑状态 JSON 全等', () => {
    const a = applyDimensionSelection(
      applyDimensionSelection({}, emotion.key, ['e1']),
      narrative.key,
      ['n1'],
    );
    const b = applyDimensionSelection(
      applyDimensionSelection({}, narrative.key, ['n1']),
      emotion.key,
      ['e1'],
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('清洗未知 id', () => {
    expect(parseStyleSelections({ [narrative.key]: [...narrativeIds, 'ghost'] })).toEqual({
      [narrative.key]: narrativeIds,
    });
    expect(parseStyleSelections({ bogus: ['x'] })).toEqual({});
    expect(parseStyleSelections(null)).toEqual({});
  });

  it('派生文本只用 tag，按库顺序而非传入顺序', () => {
    const s = applyDimensionSelection({}, narrative.key, [secondId!, firstId!]);
    const tags = selectCardsByIds(narrative, [firstId!, secondId!]).map((card) => card.tag);
    expect(formatStyleSelections(s)).toBe(`${narrative.label}：${tags.join('、')}`);
    expect(formatStyleSelections({})).toBe('');
  });

  it('hasStyleSelection 只认有效 id', () => {
    expect(hasStyleSelection({})).toBe(false);
    expect(hasStyleSelection({ [narrative.key]: ['ghost'] })).toBe(false);
    expect(hasStyleSelection({ [narrative.key]: narrativeIds })).toBe(true);
  });

  it('selectCardsByIds 按库顺序取对象', () => {
    const cards = selectCardsByIds(narrative, [secondId!, firstId!]);
    expect(cards.map((card) => card.id)).toEqual([firstId, secondId]);
  });

  it('旧快照（只有 stylePrompt）读得出且 styleSelections 为空', () => {
    const snap = readSoftTuneStepSnapshot({
      publishScene: 'wechat',
      topicContent: '主题',
      stylePrompt: '叙事姿态：外聚焦',
    });
    expect(snap?.topicContent).toBe('主题');
    expect(snap?.styleSelections).toBeUndefined();
  });

  it('新快照读得出 styleSelections', () => {
    const snap = readSoftTuneStepSnapshot({
      publishScene: 'wechat',
      topicContent: '主题',
      styleSelections: { [narrative.key]: narrativeIds },
    });
    expect(snap?.styleSelections).toEqual({ [narrative.key]: narrativeIds });
  });
});
