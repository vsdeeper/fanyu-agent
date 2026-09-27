import { inheritEditSourceGeometry } from './edit-geometry';
import {
  getConfiguredEditImageModelId,
  getConfiguredImageModelId,
  getImageModelProfile,
} from './registry';
import { arkSeedreamProvider } from './providers/ark-seedream';
import { laozhangProvider } from './providers/laozhang';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from './types';

function getProvider(providerId: string): ImageProvider {
  if (providerId === 'ark') return arkSeedreamProvider;
  if (providerId === 'laozhang') return laozhangProvider;
  throw new Error(`未知生图 Provider: ${providerId}`);
}

/**
 * 主对话生图/改图模型路由：generate → IMAGE_MODEL_ID；edit → EDIT_IMAGE_MODEL_ID（未设则同 IMAGE）。
 * 全局 env 绝对优先，不再按场景自选或继承父图模型。
 */
export function resolveImageModelId({ mode }: { mode: 'generate' | 'edit' }): string {
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
