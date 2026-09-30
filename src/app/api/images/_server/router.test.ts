import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/app/api/chat/_server/request-settings', () => ({
  getChatSettings: vi.fn(),
}));

import { getChatSettings } from '@/app/api/chat/_server/request-settings';
import { arkSeedreamProvider } from './providers/ark-seedream';
import { laozhangProvider } from './providers/laozhang';
import { generateImageViaRouter, resolveImageModelId, resolveImageQualitySetting } from './router';
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

const generateResult: ImageGenerateResult = {
  images: [{ bytes: new Uint8Array([1]), mimeType: 'image/png' }],
};

let generateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(getChatSettings).mockReturnValue({
    providerConfigs: [],
    chatProvider: 'deepseek',
    chatModels: { modelPro: 'x', modelLite: 'x', modelMini: 'x' },
    generateImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-flare-vip', quality: 'xhigh' },
    editImage: { provider: 'laozhang', modelId: 'gpt-image-2.5-sunburst-vip', quality: 'xhigh' },
  });
  generateSpy = vi.spyOn(laozhangProvider, 'generate').mockResolvedValue(generateResult);
  vi.spyOn(arkSeedreamProvider, 'generate').mockResolvedValue(generateResult);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveImageModelId', () => {
  it('generate 使用 settings.generateImage.modelId', () => {
    expect(resolveImageModelId({ mode: 'generate' })).toBe('gpt-image-2.5-flare-vip');
  });

  it('edit 使用 settings.editImage.modelId', () => {
    expect(resolveImageModelId({ mode: 'edit' })).toBe('gpt-image-2.5-sunburst-vip');
  });

  it('无 settings 时抛错', () => {
    vi.mocked(getChatSettings).mockReturnValue(undefined);
    expect(() => resolveImageModelId({ mode: 'generate' })).toThrow(/对话设置/);
  });
});

describe('resolveImageQualitySetting', () => {
  it('generate / edit 分别读取 settings 质量', () => {
    vi.mocked(getChatSettings).mockReturnValue({
      providerConfigs: [],
      chatProvider: 'deepseek',
      chatModels: { modelPro: 'x', modelLite: 'x', modelMini: 'x' },
      generateImage: {
        provider: 'laozhang',
        modelId: 'gpt-image-2.5-flare-vip',
        quality: 'max',
      },
      editImage: {
        provider: 'laozhang',
        modelId: 'gpt-image-2.5-sunburst-vip',
        quality: 'high',
      },
    });
    expect(resolveImageQualitySetting({ mode: 'generate' })).toBe('max');
    expect(resolveImageQualitySetting({ mode: 'edit' })).toBe('high');
  });

  it('不支持 quality 的模型可返回 undefined', () => {
    vi.mocked(getChatSettings).mockReturnValue({
      providerConfigs: [],
      chatProvider: 'deepseek',
      chatModels: { modelPro: 'x', modelLite: 'x', modelMini: 'x' },
      generateImage: { provider: 'laozhang', modelId: 'gemini-3.1-flash-image' },
      editImage: { provider: 'laozhang', modelId: 'gemini-3.1-flash-lite-image' },
    });
    expect(resolveImageQualitySetting({ mode: 'generate' })).toBeUndefined();
    expect(resolveImageQualitySetting({ mode: 'edit' })).toBeUndefined();
  });

  it('无 settings 时抛错', () => {
    vi.mocked(getChatSettings).mockReturnValue(undefined);
    expect(() => resolveImageQualitySetting({ mode: 'generate' })).toThrow(/对话设置/);
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
