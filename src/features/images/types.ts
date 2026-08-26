export type ImageCapability = 't2i' | 'i2i';

export type ImageProviderId = 'ark';

export type ImageSizeSpec = {
  presets: readonly string[];
  minPixels?: number;
  maxPixels?: number;
  defaultSize: string;
};

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
  /** 用户明确要求透明背景时为 true；上游改走 PNG + 透明 prompt */
  transparent?: boolean;
};

export type GeneratedImagePayload = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ImageGenerateResult = {
  images: GeneratedImagePayload[];
};

export type ImageProvider = {
  id: ImageProviderId;
  generate(req: ImageGenerateRequest): Promise<ImageGenerateResult>;
};
