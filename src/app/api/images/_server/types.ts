export type ImageCapability = 't2i' | 'i2i';

export type ImageProviderId = 'ark' | 'laozhang';

export type ImageSpec = {
  /** 尺寸规格：预设档位 + 默认档 */
  size: { presets: readonly string[]; default: string };
  /** 上游尺寸入参格式：tier=原生支持 1K/2K/4K 等档位串；pixel=须换算为 WIDTHxHEIGHT。 */
  sizeInput: 'tier' | 'pixel';
  /** 像素入参模型的档位长边表；存在时优先用长边 + 宽高比换算，而不是用正方形面积换算。 */
  tierLongEdges?: Record<string, number>;
  /** 像素尺寸对齐步长；GPT Image 2 要求宽高为 16 的倍数。 */
  dimensionMultiple?: number;
  /** 像素入参模型支持的最大长短边比例。 */
  maxAspectRatio?: number;
  minPixels?: number;
  maxPixels?: number;
  /** 上游是否接受 `output_format`（png/jpeg）参数。4.5 起方舟 Seedream 不支持该参数，传则 400；缺省视为 true。 */
  supportsOutputFormat?: boolean;
  /** 生成质量档位（如 'high'）。仅支持 quality 的上游登记；缺省表示不支持 quality。 */
  quality?: { presets: readonly string[]; default: string };
};

export type ImageModelProfile = {
  id: string;
  provider: ImageProviderId;
  capabilities: ImageCapability[];
  label: string;
  /** 能力说明 + 擅长场景，供主模型按其强度按需选型 */
  description: string;
};

export type ImageGenerateRequest = {
  modelId: string;
  prompt: string;
  mode: 'generate' | 'edit';
  referenceImageDataUrls?: string[];
  size?: string;
  /** 生图质量档位；仅支持 quality 的模型会透传上游，缺省由 spec 默认值决定 */
  quality?: string;
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
