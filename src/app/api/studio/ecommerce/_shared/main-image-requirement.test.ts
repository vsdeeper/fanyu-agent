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
});
