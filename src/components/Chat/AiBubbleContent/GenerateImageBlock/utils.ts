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

export function isGenerateImageReady(output: GenerateImageOutput | undefined): boolean {
  return output?.ok === true && Boolean(output.assetId);
}
