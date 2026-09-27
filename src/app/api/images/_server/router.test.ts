import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { arkSeedreamProvider } from './providers/ark-seedream';
import { laozhangProvider } from './providers/laozhang';
import { generateImageViaRouter, resolveImageModelId } from './router';
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

const ORIGINAL_IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID;
const ORIGINAL_EDIT_IMAGE_MODEL_ID = process.env.EDIT_IMAGE_MODEL_ID;

const generateResult: ImageGenerateResult = {
  images: [{ bytes: new Uint8Array([1]), mimeType: 'image/png' }],
};

let generateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.IMAGE_MODEL_ID = 'gpt-image-2.5-flare-vip';
  process.env.EDIT_IMAGE_MODEL_ID = 'gpt-image-2.5-sunburst-vip';
  generateSpy = vi.spyOn(laozhangProvider, 'generate').mockResolvedValue(generateResult);
  vi.spyOn(arkSeedreamProvider, 'generate').mockResolvedValue(generateResult);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env.IMAGE_MODEL_ID = ORIGINAL_IMAGE_MODEL_ID;
  if (ORIGINAL_EDIT_IMAGE_MODEL_ID === undefined) {
    delete process.env.EDIT_IMAGE_MODEL_ID;
  } else {
    process.env.EDIT_IMAGE_MODEL_ID = ORIGINAL_EDIT_IMAGE_MODEL_ID;
  }
});

describe('resolveImageModelId', () => {
  it('generate 使用 IMAGE_MODEL_ID', () => {
    expect(resolveImageModelId({ mode: 'generate' })).toBe('gpt-image-2.5-flare-vip');
  });

  it('edit 使用 EDIT_IMAGE_MODEL_ID', () => {
    expect(resolveImageModelId({ mode: 'edit' })).toBe('gpt-image-2.5-sunburst-vip');
  });

  it('EDIT 未设时回落 IMAGE', () => {
    delete process.env.EDIT_IMAGE_MODEL_ID;
    expect(resolveImageModelId({ mode: 'edit' })).toBe('gpt-image-2.5-flare-vip');
  });
});

describe('generateImageViaRouter', () => {
  it('改图未指定尺寸与比例时把源图几何透传给 provider', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2.5-flare-vip',
      prompt: '改图',
      mode: 'edit',
      referenceImageDataUrls: [pngDataUrl(1536, 2048)],
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gpt-image-2.5-flare-vip',
        size: '1536x2048',
        aspectRatio: '3:4',
      }),
    );
  });

  it('生图请求不注入源图几何', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2.5-flare-vip',
      prompt: '生图',
      mode: 'generate',
    });

    const request = generateSpy.mock.calls[0][0] as ImageGenerateRequest;
    expect(request.size).toBeUndefined();
    expect(request.aspectRatio).toBeUndefined();
  });

  it('调用方已指定比例时不覆盖', async () => {
    await generateImageViaRouter({
      modelId: 'gpt-image-2.5-flare-vip',
      prompt: '改成横版',
      mode: 'edit',
      referenceImageDataUrls: [pngDataUrl(1536, 2048)],
      aspectRatio: '16:9',
    });

    const request = generateSpy.mock.calls[0][0] as ImageGenerateRequest;
    expect(request.aspectRatio).toBe('16:9');
    expect(request.size).toBeUndefined();
  });
});
