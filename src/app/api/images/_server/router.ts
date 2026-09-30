import { inheritEditSourceGeometry } from './edit-geometry';
import { getImageModelProfile } from './registry';
import { arkSeedreamProvider } from './providers/ark-seedream';
import { laozhangProvider } from './providers/laozhang';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from './types';
import { getChatSettings } from '@/app/api/chat/_server/request-settings';

function getProvider(providerId: string): ImageProvider {
  if (providerId === 'ark') return arkSeedreamProvider;
  if (providerId === 'laozhang') return laozhangProvider;
  throw new Error(`未知生图 Provider: ${providerId}`);
}

/**
 * 主对话生图/改图模型：仅本轮 chat settings 的 generateImage / editImage。
 */
export function resolveImageModelId({ mode }: { mode: 'generate' | 'edit' }): string {
  const settings = getChatSettings();
  if (!settings) {
    throw new Error('缺少对话设置，无法解析生图模型');
  }
  return mode === 'edit' ? settings.editImage.modelId : settings.generateImage.modelId;
}

/**
 * 主对话生图/改图默认质量：仅本轮 chat settings；不支持 quality 的模型可能无该字段。
 */
export function resolveImageQualitySetting({
  mode,
}: {
  mode: 'generate' | 'edit';
}): string | undefined {
  const settings = getChatSettings();
  if (!settings) {
    throw new Error('缺少对话设置，无法解析生图质量');
  }
  return mode === 'edit' ? settings.editImage.quality : settings.generateImage.quality;
}

export async function generateImageViaRouter(
  req: ImageGenerateRequest,
): Promise<ImageGenerateResult> {
  const profile = getImageModelProfile(req.modelId);
  if (!profile) {
    throw new Error('不支持的生图模型');
  }

  if (req.mode === 'edit' && !profile.capabilities.includes('i2i')) {
    throw new Error('当前模型不支持改图');
  }

  // 改图未指定尺寸/比例时继承源图（详见 edit-geometry），生图与非改图请求不受影响
  const geometry = inheritEditSourceGeometry(req, profile.id);
  if (geometry.size || geometry.aspectRatio) {
    console.info('[images] 改图继承源图几何', {
      modelId: profile.id,
      size: geometry.size ?? '默认档位',
      aspectRatio: geometry.aspectRatio,
    });
  }

  const provider = getProvider(profile.provider);
  return provider.generate({ ...req, ...geometry, modelId: profile.id });
}
