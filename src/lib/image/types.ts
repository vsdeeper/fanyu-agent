export type ImageCapability = 't2i' | 'i2i';

export type ImageProviderId = 'ark' | 'flux-art';

export type ImageModelProfile = {
  id: string;
  provider: ImageProviderId;
  capabilities: ImageCapability[];
  label: string;
};

export type ImageGenerateRequest = {
  modelId: string;
  prompt: string;
  mode: 'generate' | 'edit';
  referenceImageDataUrls?: string[];
  size?: string;
};

export type GeneratedImagePayload = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ImageGenerateResult = {
  images: GeneratedImagePayload[];
};

export type ImageToolSuccess = {
  ok: true;
  assetId: string;
  url: string;
  modelId: string;
  parentId: string | null;
};

export type ImageToolFailure = {
  ok: false;
  error: string;
};

export type ImageToolResult = ImageToolSuccess | ImageToolFailure;

export type ImageProvider = {
  id: ImageProviderId;
  generate(req: ImageGenerateRequest): Promise<ImageGenerateResult>;
};
