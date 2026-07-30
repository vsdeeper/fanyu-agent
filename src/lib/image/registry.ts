import { requireEnv } from '@/lib/env';
import type { ImageModelProfile } from './types';

/** 首版默认方舟 Seedream；Flux Art 模型仅注册，Provider 二期实现 */
export function getDefaultImageModelId(): string {
  return requireEnv('ARK_IMAGE_MODEL_ID');
}

const FLUX_ART_MODELS: ImageModelProfile[] = [
  {
    id: 'gpt-image-2',
    provider: 'flux-art',
    capabilities: ['t2i', 'i2i'],
    label: 'GPT Image 2（Flux Art）',
  },
  {
    id: 'flux-kontext-pro',
    provider: 'flux-art',
    capabilities: ['t2i', 'i2i'],
    label: 'Flux Kontext Pro（Flux Art）',
  },
];

export function listImageModels(): ImageModelProfile[] {
  return [
    {
      id: getDefaultImageModelId(),
      provider: 'ark',
      capabilities: ['t2i', 'i2i'],
      label: 'Seedream（方舟）',
    },
    ...FLUX_ART_MODELS,
  ];
}

export function getImageModelProfile(modelId: string): ImageModelProfile | undefined {
  const normalized = modelId.trim();
  return listImageModels().find((item) => item.id === normalized);
}
