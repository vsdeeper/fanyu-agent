import { describe, expect, it } from 'vitest';
import {
  MAIN_IMAGE_REQUIREMENT_SAMPLE,
  formatMainImageRequirement,
} from './main-image-requirement';

describe('formatMainImageRequirement', () => {
  it('样例格式保持不变', () => {
    expect(formatMainImageRequirement(MAIN_IMAGE_REQUIREMENT_SAMPLE)).toBe(
      MAIN_IMAGE_REQUIREMENT_SAMPLE,
    );
  });

  it('样例含画面文案列表', () => {
    expect(MAIN_IMAGE_REQUIREMENT_SAMPLE).toContain('画面文案：\n- 轻盈随行');
  });
});
