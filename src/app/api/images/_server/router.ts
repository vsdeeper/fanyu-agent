import { inheritEditSourceGeometry } from './edit-geometry';
import {
  getConfiguredEditImageModelId,
  getConfiguredImageModelId,
  getImageModelProfile,
} from './registry';
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
 * 主对话生图/改图模型：有 chat settings 时用 generateImage/editImage；否则 IMAGE_/EDIT_IMAGE_MODEL_ID。
 */
export function resolveImageModelId({ mode }: { mode: 'generate' | 'edit' }): string {
  const settings = getChatSettings();
  if (settings) {
    return mode === 'edit' ? settings.editImage.modelId : settings.generateImage.modelId;
  }
  if (mode === 'edit') {
    return getConfiguredEditImageModelId();
  }
  return getConfiguredImageModelId();
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
