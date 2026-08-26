import { getCurrentImageModelId, getImageModelProfile } from '../registry';
import { arkSeedreamProvider } from './providers/ark-seedream';
import type { ImageGenerateRequest, ImageGenerateResult, ImageProvider } from '../types';

function getProvider(providerId: string): ImageProvider {
  if (providerId === 'ark') return arkSeedreamProvider;
  throw new Error(`未知生图 Provider: ${providerId}`);
}

export function resolveImageModelId({
  requestedModelId,
  parentModelId,
}: {
  requestedModelId?: string;
  parentModelId?: string;
}): string {
  if (requestedModelId?.trim()) {
    return requestedModelId.trim();
  }
  // 修复：多轮改图默认沿用上一张 modelId，避免换模型丢风格一致性
  if (parentModelId?.trim()) {
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
