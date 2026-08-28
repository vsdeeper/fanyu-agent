import type { ImageModelProfile } from './types';
import { CURRENT_IMAGE_MODEL_ID } from './image-spec';

export { CURRENT_IMAGE_MODEL_ID };

/** 当前生图模型；换接入点改 CURRENT_IMAGE_MODEL_ID */
export function getCurrentImageModelId(): string {
  return CURRENT_IMAGE_MODEL_ID;
}

export function listImageModels(): ImageModelProfile[] {
  return [
    {
      id: 'doubao-seedream-5-0-lite-260128',
      provider: 'ark',
      capabilities: ['t2i', 'i2i'],
      label: 'Seedream（方舟）',
    },
    {
      id: 'gemini-3.1-flash-lite-image',
      provider: 'laozhang',
      capabilities: ['t2i', 'i2i'],
      label: 'Gemini Flash Lite Image（老张）',
    },
  ];
}

export function getImageModelProfile(modelId: string): ImageModelProfile | undefined {
  const normalized = modelId.trim();
  return listImageModels().find((item) => item.id === normalized);
}
