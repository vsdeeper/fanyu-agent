/**
 * 质量档位中文文案（前端展示用）。服务端档位串沿用 IMAGE_QUALITY_VALUES。
 */
export const QUALITY_LABEL: Record<string, string> = {
  high: '高质量',
  medium: '中等质量',
  low: '低质量',
  auto: '自动',
};

/**
 * 清晰度档位中文文案（前端展示用）。
 */
export const CLARITY_LABEL: Record<string, string> = {
  '1K': '标准',
  '2K': '高清',
  '4K': '超清',
};

/**
 * 电商表单需要的模型能力投影。
 *
 * 注意：须与 `app/api/images/_server/image-spec.ts` 的 `IMAGE_SPEC_BY_MODEL_ID` 以及
 * `app/api/images/_server/registry.ts` 的模型清单保持同步。即使暂时漂移，
 * 服务端 `generate-one.ts` 仍会用 `isValidImageSize` / `resolveImageQuality` 把
 * 非法档位归一为有效值（前端这里只做展示与默认值推算）。
 */
export type EcomModelCapability = {
  id: string;
  label: string;
  /** = spec.size.presets，模型可选的清晰度档位 */
  clarityOptions: string[];
  /** = spec.size.default；默认 2K，仅恒定 1K 的模型为 1K */
  clarityDefault: string;
  /** = spec.quality?.presets，支持 quality 时才有（不支持的模型前端隐藏质量字段） */
  qualityOptions?: string[];
  /** = spec.quality?.default；显示时默认高质量 */
  qualityDefault?: string;
};

export const MODEL_CAPABILITIES: EcomModelCapability[] = [
  {
    id: 'gpt-image-2-vip',
    label: 'GPT Image 2 VIP',
    clarityOptions: ['1K', '2K', '4K'],
    clarityDefault: '2K',
    qualityOptions: ['high', 'medium', 'low', 'auto'],
    qualityDefault: 'high',
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini Flash Image',
    clarityOptions: ['1K', '2K', '4K'],
    clarityDefault: '2K',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini Flash Lite Image',
    clarityOptions: ['1K'],
    clarityDefault: '1K',
  },
  {
    id: 'doubao-seedream-4-5-251128',
    label: 'Seedream 4.5',
    clarityOptions: ['2K', '4K'],
    clarityDefault: '2K',
  },
  {
    id: 'doubao-seedream-5-0-lite-260128',
    label: 'Seedream',
    clarityOptions: ['2K', '4K'],
    clarityDefault: '2K',
  },
];

/** 按模型 id 查找能力；未登记返回 undefined */
export function getModelCapability(id: string): EcomModelCapability | undefined {
  return MODEL_CAPABILITIES.find((m) => m.id === id);
}

/** 该模型是否支持质量档位（前端据此决定是否渲染质量字段） */
export function isQualitySupported(id: string): boolean {
  return Boolean(getModelCapability(id)?.qualityOptions?.length);
}

/** 模型可选质量下拉（不支持的模型返回空数组） */
export function toQualityOptions(id: string): { value: string; label: string }[] {
  return (
    getModelCapability(id)?.qualityOptions?.map((value) => ({
      value,
      label: QUALITY_LABEL[value] ?? value,
    })) ?? []
  );
}

/** 模型可选清晰度下拉 */
export function toClarityOptions(id: string): { value: string; label: string }[] {
  return (getModelCapability(id)?.clarityOptions ?? []).map((value) => ({
    value,
    label: `${value} ${CLARITY_LABEL[value] ?? ''}`.trim(),
  }));
}

/**
 * 模型下拉（仅 id + label），供模型 Select 直接使用。
 */
export function toModelOptions(): { value: string; label: string }[] {
  return MODEL_CAPABILITIES.map((m) => ({ value: m.id, label: m.label }));
}

/** 工作台生图数量档位 */
export const VISUAL_COUNT_OPTIONS = ['1', '2', '3', '4'] as const;

export const VISUAL_COUNT_DEFAULT = '1';

/** 数量下拉（给 antd Select），带「N 张」文案 */
export function toCountOptions(): { value: string; label: string }[] {
  return VISUAL_COUNT_OPTIONS.map((value) => ({
    value,
    label: `${value} 张`,
  }));
}
