export type ProductModelCapability = {
  id: string;
  label: string;
  clarityOptions: string[];
  clarityDefault: string;
  qualityDefault?: string;
};

export const MODEL_CAPABILITIES: ProductModelCapability[] = [
  {
    id: 'gpt-image-2-vip',
    label: 'GPT Image 2 VIP',
    clarityOptions: ['1K', '2K', '4K'],
    clarityDefault: '2K',
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

/** 返回模型能力；未登记模型返回 undefined。 */
export function getModelCapability(id: string): ProductModelCapability | undefined {
  return MODEL_CAPABILITIES.find((item) => item.id === id);
}

/** 返回模型下拉选项。 */
export function toModelOptions(): { value: string; label: string }[] {
  return MODEL_CAPABILITIES.map(({ id, label }) => ({ value: id, label }));
}

/** 返回指定模型可用的清晰度选项。 */
export function toClarityOptions(id: string): { value: string; label: string }[] {
  const labelByValue: Record<string, string> = {
    '1K': '标准',
    '2K': '高清',
    '4K': '超清',
  };
  return (getModelCapability(id)?.clarityOptions ?? []).map((value) => ({
    value,
    label: `${value} ${labelByValue[value] ?? ''}`.trim(),
  }));
}

/** 返回 1 至 4 张的生成数量选项。 */
export function toCountOptions(): { value: string; label: string }[] {
  return ['1', '2', '3', '4'].map((value) => ({ value, label: `${value} 张` }));
}
