import { describe, expect, it } from 'vitest';
import {
  DETAIL_IMAGE_REQUIREMENT_SAMPLE,
  formatDetailImageRequirement,
} from './detail-image-requirement';

describe('formatDetailImageRequirement', () => {
  it('样例格式保持不变', () => {
    expect(formatDetailImageRequirement(DETAIL_IMAGE_REQUIREMENT_SAMPLE)).toBe(
      DETAIL_IMAGE_REQUIREMENT_SAMPLE,
    );
  });

  it('多行展示重点收成列表', () => {
    const raw = [
      '设计目标：看一眼便知风量覆盖柔劲两档',
      '展示重点：斜侧微距捕捉扇叶直径与机身比例关系',
      '展示重点：正视机顶按键特写，手指指示循环逻辑',
      '展示重点：侧逆光带出扇叶转动层次的柔风与强风对比',
    ].join('\n');
    expect(formatDetailImageRequirement(raw)).toBe(
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
    expect(formatDetailImageRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌', '- 斜侧光看见沿口'].join('\n'),
    );
  });

  it('去掉代码围栏与二级标题', () => {
    const raw = '```markdown\n## 品牌认知\n设计目标：建立印象\n展示重点：中景全貌\n```';
    expect(formatDetailImageRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });

  it('空白输出得到空串', () => {
    expect(formatDetailImageRequirement('   \n  ')).toBe('');
  });
});
