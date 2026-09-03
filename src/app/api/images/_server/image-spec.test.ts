import { describe, expect, it } from 'vitest';
import {
  getImageSpec,
  parsePixelSize,
  resolveImageSize,
  resolveOutboundImageSize,
} from './image-spec';

describe('resolveImageSize', () => {
  it('像素入参模型会把所有登记的 K 档位换算成 WxH', () => {
    const spec = getImageSpec('doubao-seedream-4-5-251128');

    for (const tier of spec.size.presets) {
      expect(resolveOutboundImageSize(tier, undefined, spec)).toMatch(/^\d+x\d+$/);
    }
  });

  it('原生支持 K 档位的模型保持档位串直传', () => {
    const spec = getImageSpec('gemini-3.1-flash-image');

    expect(resolveOutboundImageSize('1K', '16:9', spec)).toBe('1K');
    expect(resolveOutboundImageSize('2K', '16:9', spec)).toBe('2K');
    expect(resolveOutboundImageSize('4K', '16:9', spec)).toBe('4K');
  });

  it('GPT Image 2 按模型约束把 K 档位换算成官方可用尺寸', () => {
    const spec = getImageSpec('gpt-image-2-vip');

    expect(resolveOutboundImageSize('1K', '16:9', spec)).toBe('1280x720');
    expect(resolveOutboundImageSize('2K', '16:9', spec)).toBe('2048x1152');
    expect(resolveOutboundImageSize('4K', '16:9', spec)).toBe('3840x2160');
    expect(resolveOutboundImageSize('4K', '1:1', spec)).toBe('2880x2880');
  });

  it('把像素入参模型的 4K 清晰度按宽高比换算成 WxH', () => {
    const spec = getImageSpec('doubao-seedream-4-5-251128');
    const size = resolveImageSize('4K', '16:9', spec);
    const dims = parsePixelSize(size);

    expect(dims).not.toBeNull();
    expect(size).toMatch(/^\d+x\d+$/);
    expect(dims!.width * dims!.height).toBeLessThanOrEqual(spec.maxPixels!);
    expect(dims!.width / dims!.height).toBeCloseTo(16 / 9, 1);
  });
});
