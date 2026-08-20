export type ImageCapability = 't2i' | 'i2i';

export type ImageProviderId = 'ark' | 'flux-art';

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

/** edit 无源图时的失败文案；前端据此不渲染失败缩略图，改由主模型文字提示 */
export const IMAGE_TOOL_PASTE_SOURCE_ERROR = '请将要修改的图复制粘贴到对话框后再试';

export type ImageToolResult = ImageToolSuccess | ImageToolFailure;

export type ImageProvider = {
  id: ImageProviderId;
  generate(req: ImageGenerateRequest): Promise<ImageGenerateResult>;
};
