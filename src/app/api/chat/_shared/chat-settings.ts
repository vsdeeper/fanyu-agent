/** 对话请求可覆盖的供应商与能力选型（Client + Server 共用契约） */

export type ProviderKind = 'deepseek' | 'ark' | 'zhipu' | 'laozhang';
export type ProviderCapability = 'chat' | 'generate' | 'edit';
export type ChatProviderId = 'deepseek' | 'ark' | 'zhipu';

export const PROVIDER_KINDS: ProviderKind[] = ['deepseek', 'ark', 'zhipu', 'laozhang'];

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  deepseek: 'DeepSeek',
  ark: '方舟 Ark',
  zhipu: '智谱',
  laozhang: '老张',
};

/** 各供应商已接入能力（非用户勾选） */
export const PROVIDER_CAPABILITIES: Record<ProviderKind, readonly ProviderCapability[]> = {
  deepseek: ['chat'],
  ark: ['chat', 'generate', 'edit'],
  zhipu: ['chat'],
  laozhang: ['generate', 'edit'],
};

export const CHAT_PROVIDER_IDS: ChatProviderId[] = ['deepseek', 'ark', 'zhipu'];

export const DEEPSEEK_REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

export type DeepseekReasoningEffort = (typeof DEEPSEEK_REASONING_EFFORTS)[number];

export const ZHIPU_REASONING_EFFORTS = ['low', 'high', 'max'] as const;
export type ZhipuReasoningEffort = (typeof ZHIPU_REASONING_EFFORTS)[number];

/** 生图/改图质量档位（与 images IMAGE_QUALITY_VALUES 对齐；仅 supportsQuality 模型使用） */
export const IMAGE_QUALITY_VALUES = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type ImageQualityValue = (typeof IMAGE_QUALITY_VALUES)[number];
/** 支持 quality 的模型缺省档；旧本地设置无该字段时回填 */
export const DEFAULT_IMAGE_QUALITY: ImageQualityValue = 'xhigh';

/** 生图/改图模型按供应商（须与 images registry / image-spec 同步） */
export type ImageModelOption = {
  id: string;
  label: string;
  /** 是否支持上游 quality 档位（目前仅 GPT Image 系列） */
  supportsQuality?: boolean;
  /** 该模型可用 quality 子集；缺省=全量 IMAGE_QUALITY_VALUES */
  qualityPresets?: readonly ImageQualityValue[];
};

export const IMAGE_MODELS_BY_PROVIDER: Record<'ark' | 'laozhang', ImageModelOption[]> = {
  laozhang: [
    { id: 'gpt-image-2.5-flare-vip', label: 'GPT Image 2.5 Flare VIP', supportsQuality: true },
    {
      id: 'gpt-image-2.5-sunburst-vip',
      label: 'GPT Image 2.5 Sunburst VIP',
      supportsQuality: true,
    },
    {
      id: 'gpt-image-2-vip',
      label: 'GPT Image 2 VIP',
      supportsQuality: true,
      qualityPresets: ['low', 'medium', 'high'],
    },
    { id: 'gemini-3.1-flash-image', label: 'Gemini Flash Image' },
    { id: 'gemini-3.1-flash-lite-image', label: 'Gemini Flash Lite Image' },
  ],
  ark: [
    { id: 'doubao-seedream-4-5-251128', label: 'Seedream 4.5' },
    { id: 'doubao-seedream-5-0-lite-260128', label: 'Seedream 5.0 Lite' },
  ],
};

export type ProviderCredential = {
  provider: ProviderKind;
  apiKey: string;
  baseUrl: string;
};

export type ChatModelsConfig = {
  modelPro: string;
  modelLite: string;
  modelMini: string;
};

export type ImageCapabilityConfig = {
  provider: 'laozhang' | 'ark';
  modelId: string;
  /** 仅 supportsQuality 的模型有值；不支持时省略 */
  quality?: ImageQualityValue;
};

export type ChatSettingsPayload = {
  providerConfigs: ProviderCredential[];
  chatProvider: ChatProviderId;
  chatModels: ChatModelsConfig;
  reasoningEffort?: string;
  generateImage: ImageCapabilityConfig;
  editImage: ImageCapabilityConfig;
};

/** 按模型 id 查找生图选项 */
export function findImageModelOption(modelId: string): ImageModelOption | undefined {
  for (const list of Object.values(IMAGE_MODELS_BY_PROVIDER)) {
    const hit = list.find((item) => item.id === modelId);
    if (hit) return hit;
  }
  return undefined;
}

/** 该生图/改图模型是否支持 quality 档位 */
export function imageModelSupportsQuality(modelId: string): boolean {
  return Boolean(findImageModelOption(modelId)?.supportsQuality);
}

/** 模型可用 quality 档位；不支持时返回空数组 */
export function imageModelQualityPresets(modelId: string): readonly ImageQualityValue[] {
  const option = findImageModelOption(modelId);
  if (!option?.supportsQuality) return [];
  return option.qualityPresets ?? IMAGE_QUALITY_VALUES;
}

/**
 * 模型缺省 quality：统一以 DEFAULT_IMAGE_QUALITY 为基准；
 * 若该值不在模型 presets 内（如 Image 2）则回落 high。
 */
export function defaultImageQualityForModel(modelId: string): ImageQualityValue {
  const presets = imageModelQualityPresets(modelId);
  if (presets.includes(DEFAULT_IMAGE_QUALITY)) return DEFAULT_IMAGE_QUALITY;
  if (presets.includes('high')) return 'high';
  return presets[0] ?? DEFAULT_IMAGE_QUALITY;
}

export function providerHasCapability(kind: ProviderKind, capability: ProviderCapability): boolean {
  return PROVIDER_CAPABILITIES[kind].includes(capability);
}

export function filterProvidersByCapability(
  configs: readonly ProviderCredential[],
  capability: ProviderCapability,
): ProviderCredential[] {
  const seen = new Set<ProviderKind>();
  const out: ProviderCredential[] = [];
  for (const item of configs) {
    if (seen.has(item.provider)) continue;
    if (!providerHasCapability(item.provider, capability)) continue;
    seen.add(item.provider);
    out.push(item);
  }
  return out;
}

export function findCredential(
  configs: readonly ProviderCredential[],
  kind: ProviderKind,
): ProviderCredential | undefined {
  return configs.find((item) => item.provider === kind);
}

function isProviderKind(value: unknown): value is ProviderKind {
  return typeof value === 'string' && (PROVIDER_KINDS as string[]).includes(value);
}

function isChatProviderId(value: unknown): value is ChatProviderId {
  return typeof value === 'string' && (CHAT_PROVIDER_IDS as string[]).includes(value);
}

function isImageProvider(value: unknown): value is 'laozhang' | 'ark' {
  return value === 'laozhang' || value === 'ark';
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export type ParseChatSettingsResult =
  { ok: true; settings: ChatSettingsPayload } | { ok: false; message: string };

/** 校验并规范化客户端 settings；失败返回中文可读原因 */
export function parseChatSettingsPayload(raw: unknown): ParseChatSettingsResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: '缺少对话设置' };
  }
  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body.providerConfigs) || body.providerConfigs.length === 0) {
    return { ok: false, message: '请至少配置一个供应商' };
  }

  const providerConfigs: ProviderCredential[] = [];
  const seen = new Set<ProviderKind>();
  for (const row of body.providerConfigs) {
    if (!row || typeof row !== 'object') {
      return { ok: false, message: '供应商配置无效' };
    }
    const record = row as Record<string, unknown>;
    if (!isProviderKind(record.provider)) {
      return { ok: false, message: '未知供应商' };
    }
    const apiKey = nonEmptyString(record.apiKey);
    const baseUrl = nonEmptyString(record.baseUrl);
    if (!apiKey || !baseUrl) {
      return {
        ok: false,
        message: `${PROVIDER_LABELS[record.provider]} 的密钥与 Base URL 不能为空`,
      };
    }
    if (seen.has(record.provider)) continue;
    seen.add(record.provider);
    providerConfigs.push({ provider: record.provider, apiKey, baseUrl });
  }

  if (!isChatProviderId(body.chatProvider)) {
    return { ok: false, message: '请选择对话供应商' };
  }
  if (!providerHasCapability(body.chatProvider, 'chat')) {
    return { ok: false, message: '所选供应商不支持对话' };
  }
  if (!findCredential(providerConfigs, body.chatProvider)) {
    return { ok: false, message: '对话供应商未在上方配置' };
  }

  const chatModelsRaw =
    body.chatModels && typeof body.chatModels === 'object'
      ? (body.chatModels as Record<string, unknown>)
      : null;
  const modelPro = chatModelsRaw ? nonEmptyString(chatModelsRaw.modelPro) : null;
  const modelLite = chatModelsRaw ? nonEmptyString(chatModelsRaw.modelLite) : null;
  const modelMini = chatModelsRaw ? nonEmptyString(chatModelsRaw.modelMini) : null;
  if (!modelPro || !modelLite || !modelMini) {
    return { ok: false, message: '请填写对话三档模型' };
  }

  let reasoningEffort: string | undefined;
  if (body.reasoningEffort != null && body.reasoningEffort !== '') {
    if (typeof body.reasoningEffort !== 'string') {
      return { ok: false, message: '思考强度无效' };
    }
    const effort = body.reasoningEffort.trim();
    if (body.chatProvider === 'deepseek') {
      if (!(DEEPSEEK_REASONING_EFFORTS as readonly string[]).includes(effort)) {
        return { ok: false, message: 'DeepSeek 思考强度无效' };
      }
    } else if (body.chatProvider === 'zhipu') {
      if (!(ZHIPU_REASONING_EFFORTS as readonly string[]).includes(effort)) {
        return { ok: false, message: '智谱思考强度无效' };
      }
    }
    reasoningEffort = effort;
  }

  const generateImage = parseImageCapability(body.generateImage, 'generate', providerConfigs);
  if (!generateImage.ok) return generateImage;
  const editImage = parseImageCapability(body.editImage, 'edit', providerConfigs);
  if (!editImage.ok) return editImage;

  return {
    ok: true,
    settings: {
      providerConfigs,
      chatProvider: body.chatProvider,
      chatModels: { modelPro, modelLite, modelMini },
      ...(reasoningEffort ? { reasoningEffort } : {}),
      generateImage: generateImage.value,
      editImage: editImage.value,
    },
  };
}

function parseImageCapability(
  raw: unknown,
  capability: 'generate' | 'edit',
  configs: ProviderCredential[],
): { ok: true; value: ImageCapabilityConfig } | { ok: false; message: string } {
  const label = capability === 'generate' ? '生图' : '改图';
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: `请配置${label}` };
  }
  const record = raw as Record<string, unknown>;
  if (!isImageProvider(record.provider)) {
    return { ok: false, message: `${label}供应商无效` };
  }
  if (!providerHasCapability(record.provider, capability)) {
    return { ok: false, message: `所选供应商不支持${label}` };
  }
  if (!findCredential(configs, record.provider)) {
    return { ok: false, message: `${label}供应商未在上方配置` };
  }
  const modelId = nonEmptyString(record.modelId);
  if (!modelId) {
    return { ok: false, message: `请填写${label}模型` };
  }
  const allowed = IMAGE_MODELS_BY_PROVIDER[record.provider].some((item) => item.id === modelId);
  if (!allowed) {
    return { ok: false, message: `${label}模型与供应商不匹配` };
  }
  // 不支持 quality 的模型：忽略传入值，不写入 settings
  if (!imageModelSupportsQuality(modelId)) {
    return { ok: true, value: { provider: record.provider, modelId } };
  }
  const presets = imageModelQualityPresets(modelId);
  let quality = defaultImageQualityForModel(modelId);
  if (record.quality != null && record.quality !== '') {
    if (typeof record.quality !== 'string') {
      return { ok: false, message: `${label}质量档位无效` };
    }
    // 全局未知档位拒绝；已知但不在该模型子集内则回落模型默认（如 Image 2 + xhigh → high）
    if (!(IMAGE_QUALITY_VALUES as readonly string[]).includes(record.quality)) {
      return { ok: false, message: `${label}质量档位无效` };
    }
    if (presets.includes(record.quality as ImageQualityValue)) {
      quality = record.quality as ImageQualityValue;
    }
  }
  return { ok: true, value: { provider: record.provider, modelId, quality } };
}
