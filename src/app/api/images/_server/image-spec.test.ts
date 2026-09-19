import { describe, expect, it } from 'vitest';
import {
  getImageSpec,
  nearestSupportedAspectRatio,
  parseAspectRatio,
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

  it('小数比例（公众号头图 2.35:1）也换算得出像素尺寸', () => {
    const gptImage = getImageSpec('gpt-image-2-vip');
    expect(resolveOutboundImageSize('1K', '2.35:1', gptImage)).toBe('1280x544');

    const seedream = getImageSpec('doubao-seedream-4-5-251128');
    const dims = parsePixelSize(resolveImageSize('2K', '2.35:1', seedream));
    expect(dims).not.toBeNull();
    expect(dims!.width / dims!.height).toBeCloseTo(2.35, 1);
  });

  it('小数比例反过来写（1:2.35 竖版）同样换算得出尺寸', () => {
    const gptImage = getImageSpec('gpt-image-2-vip');
    expect(resolveOutboundImageSize('1K', '1:2.35', gptImage)).toBe('544x1280');

    const seedream = getImageSpec('doubao-seedream-4-5-251128');
    const dims = parsePixelSize(resolveImageSize('2K', '1:2.35', seedream));
    expect(dims).not.toBeNull();
    expect(dims!.width / dims!.height).toBeCloseTo(1 / 2.35, 1);
  });

  it('解析小数比例，非法值仍判为无比例', () => {
    expect(parseAspectRatio('2.35:1')).toEqual({ w: 2.35, h: 1 });
    expect(parseAspectRatio('16:9')).toEqual({ w: 16, h: 9 });
    expect(parseAspectRatio('auto')).toBeNull();
    expect(parseAspectRatio('16/9')).toBeNull();
    expect(parseAspectRatio('0:1')).toBeNull();
  });

  it('枚举外的比例吸附到最近的枚举值', () => {
    // 2.35:1 比 16:9 更接近 Gemini 支持的 21:9（2.333:1），差 0.7%
    expect(nearestSupportedAspectRatio(2.35)).toBe('21:9');
    // 竖版反过来：Gemini 没有 1:2.35，最接近的是 9:16（差得比横版多，枚举所限）
    expect(nearestSupportedAspectRatio(1 / 2.35)).toBe('9:16');
    expect(nearestSupportedAspectRatio(1)).toBe('1:1');
    expect(nearestSupportedAspectRatio(1.5)).toBe('3:2');
    // 与 21:9 等距的 9:21（对数距离）取枚举中先出现的一项
    expect(nearestSupportedAspectRatio(21 / 9)).toBe('21:9');
  });
});
