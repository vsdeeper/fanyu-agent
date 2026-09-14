import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { inheritEditSourceGeometry, resolveInheritedEditGeometry } from './edit-geometry';
import { getImageSpec, resolveOutboundImageSize } from './image-spec';
import type { ImageGenerateRequest } from './types';

/** 造一张只含 PNG 签名的 24 字节图：够 readImageDimensions 从 IHDR 读出宽高。 */
function pngDataUrl(width: number, height: number): string {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

function editRequest(overrides: Partial<ImageGenerateRequest> = {}): ImageGenerateRequest {
  return {
    modelId: 'gpt-image-2-vip',
    prompt: '改图',
    mode: 'edit',
    referenceImageDataUrls: [pngDataUrl(1536, 2048)],
    ...overrides,
  };
}

describe('resolveInheritedEditGeometry', () => {
  it('像素入参模型原样沿用源图像素尺寸与比例', () => {
    const spec = getImageSpec('gpt-image-2-vip');

    expect(resolveInheritedEditGeometry({ width: 1536, height: 2048 }, spec)).toEqual({
      size: '1536x2048',
      aspectRatio: '3:4',
    });
  });

  it('源图低于模型像素下限时只沿用比例', () => {
    const spec = getImageSpec('doubao-seedream-4-5-251128');

    expect(resolveInheritedEditGeometry({ width: 1536, height: 2048 }, spec)).toEqual({
      aspectRatio: '3:4',
    });
  });

  it('源图尺寸不符合对齐步长时只沿用比例', () => {
    const spec = getImageSpec('gpt-image-2-vip');

    expect(resolveInheritedEditGeometry({ width: 1500, height: 2000 }, spec)).toEqual({
      aspectRatio: '3:4',
    });
  });

  it('档位串模型只给比例，并吸附到最近的可选比例', () => {
    const spec = getImageSpec('gemini-3.1-flash-image');

    expect(resolveInheritedEditGeometry({ width: 1536, height: 2048 }, spec)).toEqual({
      aspectRatio: '3:4',
    });
    expect(resolveInheritedEditGeometry({ width: 1774, height: 2366 }, spec)).toEqual({
      aspectRatio: '3:4',
    });
    expect(resolveInheritedEditGeometry({ width: 2000, height: 1000 }, spec)).toEqual({
      aspectRatio: '16:9',
    });
  });

  it('源图尺寸非法时返回 undefined', () => {
    expect(
      resolveInheritedEditGeometry({ width: 0, height: 2048 }, getImageSpec('gpt-image-2-vip')),
    ).toBeUndefined();
  });

  it('继承的源图尺寸按模型规格原样出站（不再落回默认档位的正方形）', () => {
    const gpt = getImageSpec('gpt-image-2-vip');
    const gptInherited = resolveInheritedEditGeometry({ width: 1536, height: 2048 }, gpt);
    expect(resolveOutboundImageSize(gptInherited?.size, gptInherited?.aspectRatio, gpt)).toBe(
      '1536x2048',
    );

    const seedream = getImageSpec('doubao-seedream-4-5-251128');
    const seedreamInherited = resolveInheritedEditGeometry({ width: 1920, height: 2560 }, seedream);
    expect(
      resolveOutboundImageSize(seedreamInherited?.size, seedreamInherited?.aspectRatio, seedream),
    ).toBe('1920x2560');
  });
});

describe('inheritEditSourceGeometry', () => {
  it('未指定尺寸与比例时按源图补上像素尺寸与比例', () => {
    expect(inheritEditSourceGeometry(editRequest(), 'gpt-image-2-vip')).toEqual({
      size: '1536x2048',
      aspectRatio: '3:4',
    });
  });

  it('调用方已给比例时不继承（用户明确要改比例）', () => {
    expect(
      inheritEditSourceGeometry(editRequest({ aspectRatio: '16:9' }), 'gpt-image-2-vip'),
    ).toEqual({});
  });

  it('比例为 auto 视为未指定', () => {
    expect(
      inheritEditSourceGeometry(editRequest({ aspectRatio: 'auto' }), 'gpt-image-2-vip'),
    ).toEqual({ size: '1536x2048', aspectRatio: '3:4' });
  });

  it('调用方已给尺寸时只继承比例', () => {
    expect(inheritEditSourceGeometry(editRequest({ size: '4K' }), 'gpt-image-2-vip')).toEqual({
      aspectRatio: '3:4',
    });
  });

  it('生图、无参考图、源图不可读时都不继承', () => {
    expect(inheritEditSourceGeometry(editRequest({ mode: 'generate' }), 'gpt-image-2-vip')).toEqual(
      {},
    );
    expect(
      inheritEditSourceGeometry(editRequest({ referenceImageDataUrls: [] }), 'gpt-image-2-vip'),
    ).toEqual({});
    expect(
      inheritEditSourceGeometry(
        editRequest({ referenceImageDataUrls: ['https://example.com/a.png'] }),
        'gpt-image-2-vip',
      ),
    ).toEqual({});
  });
});
