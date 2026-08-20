import type { ImageModelProfile } from './types';
import { CURRENT_IMAGE_MODEL_ID } from './size';

export { CURRENT_IMAGE_MODEL_ID };

/** 当前生图模型；换接入点改 CURRENT_IMAGE_MODEL_ID */
export function getCurrentImageModelId(): string {
  return CURRENT_IMAGE_MODEL_ID;
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
      id: CURRENT_IMAGE_MODEL_ID,
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
