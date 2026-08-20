import { IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/lib/images/types';

export type GenerateImageOutput = {
  ok?: boolean;
  assetId?: string;
  url?: string;
  error?: string;
};

export function getImageSrc(output: GenerateImageOutput): string {
  return output.url || `/api/images/${output.assetId}`;
}

export function isGenerateImagePending(state: string): boolean {
  return (
    state === 'input-streaming' || state === 'input-available' || state === 'approval-requested'
  );
}

export function isGenerateImageFailed(
  state: string,
  output: GenerateImageOutput | undefined,
): boolean {
  return state === 'output-error' || output?.ok === false;
}

/** 缺源图：未真正出图，不展示失败缩略图，由主模型文字提示用户粘贴 */
export function isGenerateImageSourceMissing(output: GenerateImageOutput | undefined): boolean {
  return output?.ok === false && output.error === IMAGE_TOOL_PASTE_SOURCE_ERROR;
}

export function isGenerateImageReady(output: GenerateImageOutput | undefined): boolean {
  return output?.ok === true && Boolean(output.assetId);
}
