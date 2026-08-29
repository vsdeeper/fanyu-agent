export type ImageCapability = 't2i' | 'i2i';

export type ImageProviderId = 'ark' | 'laozhang';

export type ImageSpec = {
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
  /** 生图宽高比；'auto' 或缺省表示交给模型自选（不传上游），否则如 '1:1'、'3:2'、'16:9' */
  aspectRatio?: string;
  /** 用户明确要求透明背景时为 true；上游改走 PNG + 透明 prompt */
  transparent?: boolean;
  /** 用户中断信号；上游请求据此无响应中断（降级重试前后也会检查） */
  abortSignal?: AbortSignal;
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
