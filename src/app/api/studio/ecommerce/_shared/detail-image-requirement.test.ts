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

  it('样例含画面文案列表', () => {
    expect(DETAIL_IMAGE_REQUIREMENT_SAMPLE).toContain('画面文案：\n- 清新一夏');
  });
});
