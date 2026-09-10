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
});
