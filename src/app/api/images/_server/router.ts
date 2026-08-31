import {
  getConfiguredImageModelId,
  getCurrentImageModelId,
  getImageModelProfile,
} from './registry';
import { arkSeedreamProvider } from './providers/ark-seedream';
import { laozhangProvider } from './providers/laozhang';
import { PRODUCT_IMAGE_MODEL_ID } from './assets';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from './types';

function getProvider(providerId: string): ImageProvider {
  if (providerId === 'ark') return arkSeedreamProvider;
  if (providerId === 'laozhang') return laozhangProvider;
  throw new Error(`未知生图 Provider: ${providerId}`);
}

export function resolveImageModelId({
  requestedModelId,
  parentModelId,
}: {
  requestedModelId?: string;
  parentModelId?: string;
}): string {
  // 全局已设置 IMAGE_MODEL_ID：绝对优先，主模型自选（requestedModelId）不覆盖
  const configured = getConfiguredImageModelId();
  if (configured) {
    return configured;
  }
  // 哨兵守卫：用户上传产品图落盘时 modelId 为 'user-upload'，不是真实生图模型。
  // 若被用户或父图继承，getImageModelProfile 会抛「不支持的生图模型」，故跳过、回落到后续选型。
  if (requestedModelId?.trim() && requestedModelId.trim() !== PRODUCT_IMAGE_MODEL_ID) {
    return requestedModelId.trim();
  }
  // 修复：多轮改图默认沿用上一张 modelId，避免换模型丢风格一致性
  if (parentModelId?.trim() && parentModelId.trim() !== PRODUCT_IMAGE_MODEL_ID) {
    return parentModelId.trim();
  }
  return getCurrentImageModelId();
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

  const provider = getProvider(profile.provider);
  return provider.generate({ ...req, modelId: profile.id });
}
