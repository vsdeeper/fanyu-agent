import { describe, expect, it } from 'vitest';
import { formatThemePlanRequirement } from './theme-plan-requirement';

describe('formatThemePlanRequirement', () => {
  it('多行展示重点收成列表', () => {
    const raw = [
      '设计目标：看一眼便知风量覆盖柔劲两档',
      '展示重点：斜侧微距捕捉扇叶直径与机身比例关系',
      '展示重点：正视机顶按键特写，手指指示循环逻辑',
      '展示重点：侧逆光带出扇叶转动层次的柔风与强风对比',
    ].join('\n');
    expect(formatThemePlanRequirement(raw)).toBe(
      [
        '设计目标：看一眼便知风量覆盖柔劲两档',
        '展示重点：',
        '- 斜侧微距捕捉扇叶直径与机身比例关系',
        '- 正视机顶按键特写，手指指示循环逻辑',
        '- 侧逆光带出扇叶转动层次的柔风与强风对比',
      ].join('\n'),
    );
  });

  it('分号分隔收成列表', () => {
    const raw = '设计目标：建立印象\n展示重点：中景全貌；斜侧光看见沿口';
    expect(formatThemePlanRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌', '- 斜侧光看见沿口'].join('\n'),
    );
  });

  it('去掉代码围栏与二级标题', () => {
    const raw = '```markdown\n## 品牌认知\n设计目标：建立印象\n展示重点：中景全貌\n```';
    expect(formatThemePlanRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });

  it('空白输出得到空串', () => {
    expect(formatThemePlanRequirement('   \n  ')).toBe('');
  });

  it('保留画面文案列表，且不与展示重点串段', () => {
    const raw = [
      '设计目标：第一眼记住轻巧体量',
      '画面文案：',
      '- 轻盈随行',
      '- 500ml',
      '展示重点：',
      '- 正视特写杯身',
      '- 浅台面侧逆光',
    ].join('\n');
    expect(formatThemePlanRequirement(raw)).toBe(
      [
        '设计目标：第一眼记住轻巧体量',
        '画面文案：',
        '- 轻盈随行',
        '- 500ml',
        '展示重点：',
        '- 正视特写杯身',
        '- 浅台面侧逆光',
      ].join('\n'),
    );
  });

  it('旧稿无画面文案节时仍只收设计目标与展示重点', () => {
    const raw = '设计目标：建立印象\n展示重点：中景全貌';
    expect(formatThemePlanRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
    expect(formatThemePlanRequirement(raw)).not.toContain('画面文案：');
  });

  it('includeCopy: false 时丢弃画面文案节', () => {
    const raw = [
      '设计目标：建立印象',
      '画面文案：',
      '- 清新一夏',
      '展示重点：',
      '- 中景全貌',
    ].join('\n');
    expect(formatThemePlanRequirement(raw, { includeCopy: false })).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });
});
