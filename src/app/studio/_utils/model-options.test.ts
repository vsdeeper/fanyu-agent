import { describe, expect, it } from 'vitest';
import { patchModel } from './model-options';

describe('patchModel', () => {
  it('新模型仍支持当前清晰度时保留', () => {
    const next = patchModel(
      { model: 'gpt-image-2-vip', clarity: '1K', quality: 'high' },
      'gemini-3.1-flash-image',
    );
    expect(next.model).toBe('gemini-3.1-flash-image');
    expect(next.clarity).toBe('1K');
  });

  it('新模型不支持当前清晰度时回该模型默认档', () => {
    const next = patchModel(
      { model: 'gpt-image-2-vip', clarity: '1K', quality: 'high' },
      'doubao-seedream-4-5-251128',
    );
    expect(next.clarity).toBe('2K');
  });
});
