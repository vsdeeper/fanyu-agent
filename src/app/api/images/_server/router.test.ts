import { beforeEach, describe, expect, it, vi } from 'vitest';

/** 两个 provider 同用一个 spy：本用例只关心 router 交给 provider 的入参。 */
const generateSpy = vi.hoisted(() =>
  vi.fn<(req: ImageGenerateRequest) => Promise<ImageGenerateResult>>(async () => ({
    images: [{ bytes: new Uint8Array([1]), mimeType: 'image/png' }],
  })),
);

vi.mock('server-only', () => ({}));
vi.mock('./providers/ark-seedream', () => ({
  arkSeedreamProvider: { id: 'ark', generate: generateSpy },
}));
vi.mock('./providers/laozhang', () => ({
  laozhangProvider: { id: 'laozhang', generate: generateSpy },
}));

import { generateImageViaRouter } from './router';
import type { ImageGenerateRequest, ImageGenerateResult } from './types';

/** 造一张只含 PNG 签名的 24 字节图：够 readImageDimensions 从 IHDR 读出宽高。 */
function pngDataUrl(width: number, height: number): string {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

beforeEach(() => {
  generateSpy.mockClear();
});

describe('generateImageViaRouter', () => {
  it('改图未指定尺寸与比例时把源图几何透传给 provider', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2-vip',
      prompt: '改图',
      mode: 'edit',
      referenceImageDataUrls: [pngDataUrl(1536, 2048)],
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gpt-image-2-vip',
        size: '1536x2048',
        aspectRatio: '3:4',
      }),
    );
  });

  it('生图请求不注入源图几何', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2-vip',
      prompt: '生图',
      mode: 'generate',
    });

    const request = generateSpy.mock.calls[0][0];
    expect(request.size).toBeUndefined();
    expect(request.aspectRatio).toBeUndefined();
  });

  it('调用方已指定比例时不覆盖', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2-vip',
      prompt: '改成横版',
      mode: 'edit',
      referenceImageDataUrls: [pngDataUrl(1536, 2048)],
      aspectRatio: '16:9',
    });

    const request = generateSpy.mock.calls[0][0];
    expect(request.aspectRatio).toBe('16:9');
    expect(request.size).toBeUndefined();
  });
});
