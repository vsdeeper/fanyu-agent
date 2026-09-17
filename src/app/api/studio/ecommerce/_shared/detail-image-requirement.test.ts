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

  it('样例不含画面文案', () => {
    expect(DETAIL_IMAGE_REQUIREMENT_SAMPLE).not.toContain('画面文案');
    expect(DETAIL_IMAGE_REQUIREMENT_SAMPLE).toContain('设计目标：');
    expect(DETAIL_IMAGE_REQUIREMENT_SAMPLE).toContain('展示重点：');
  });

  it('旧稿含画面文案时丢弃该节', () => {
    const raw = ['设计目标：建立印象', '画面文案：', '- 清新一夏', '展示重点：', '- 中景全貌'].join(
      '\n',
    );
    expect(formatDetailImageRequirement(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });
});
