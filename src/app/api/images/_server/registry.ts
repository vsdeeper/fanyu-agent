import type { ImageModelProfile } from './types';

/** 无 env、主模型未自选、也无父图时的兜底模型（仅兜底，非固定「当前生图模型」） */
export const FALLBACK_IMAGE_MODEL_ID = 'gemini-3.1-flash-image';

/**
 * env 设置的全局「当前生图模型」（未来全局设置写入）。
 * 返回设置值；未设置返回 null → 本轮由主模型按场景自动选型（绝对优先，自选不再覆盖）。
 */
export function getConfiguredImageModelId(): string | null {
  return process.env.IMAGE_MODEL_ID?.trim() || null;
}

/** 当前生图模型：已设置取设置值，否则兜底；仅供尺寸/描述等默认参考 */
export function getCurrentImageModelId(): string {
  return getConfiguredImageModelId() ?? FALLBACK_IMAGE_MODEL_ID;
}

export function listImageModels(): ImageModelProfile[] {
  return [
    {
      id: 'doubao-seedream-4-5-251128',
      provider: 'ark',
      capabilities: ['t2i', 'i2i'],
      label: 'Seedream 4.5',
      description:
        '方舟 Seedream 4.5，2K/4K 档位、性价比高；生图质量较 Gemini/GPT Image 略逊，艺术感与设计完成度一般，适合对设计要求不高、追求稳定省钱的日常配图与批量出图。',
    },
    {
      id: 'doubao-seedream-5-0-lite-260128',
      provider: 'ark',
      capabilities: ['t2i', 'i2i'],
      label: 'Seedream',
      description:
        '方舟新一代轻量版，生成更快、成本更低；画质同样较主力模型略逊，适合快速批量、草图占位等对质量要求不高的普通场景。',
    },
    {
      id: 'gemini-3.1-flash-lite-image',
      provider: 'laozhang',
      capabilities: ['t2i', 'i2i'],
      label: 'Gemini Flash Lite Image',
      description:
        'Nano Banana 系列轻量档，速度最快、成本最低，恒定 1K；画质较主力略减，适合草图预览、占位图与低要求简图。',
    },
    {
      id: 'gemini-3.1-flash-image',
      provider: 'laozhang',
      capabilities: ['t2i', 'i2i'],
      label: 'Gemini Flash Image',
      description:
        '谷歌 Nano Banana 2，设计出图主力之一；擅长动漫插画、艺术风格化与色彩表达，画面更有手绘质感与情绪，出图更快（约 5–10 秒）且成本更低，支持 4K 与多角色一致性；适合艺术插画、创意设计、大胆配色的表现力画面。',
    },
    {
      id: 'gpt-image-2-vip',
      provider: 'laozhang',
      capabilities: ['t2i', 'i2i'],
      label: 'GPT Image 2 VIP',
      description:
        'OpenAI 出品，设计出图主力之一；极致的写实与指令遵从，光影层次、材质物理感与影棚布光模拟出色，复杂布局与中/日文等文字渲染精准，支持原生透明背景；适合电商产品图、商拍、营销海报、UI 截图与精细文字控制。',
    },
  ];
}

/**
 * 主模型可读的可选生图模型清单（含默认标注），注入 generate_image 的 model 参数描述。
 */
export function describeImageModels(): string {
  const configured = getConfiguredImageModelId();
  const defaultId = configured ?? getCurrentImageModelId();
  return [
    `可选生图模型${configured ? `（全局设置为 ${configured}，绝对优先）` : '（未设置全局默认，请按场景自选）'}：`,
    ...listImageModels().map(
      (m) => `- ${m.id}（${m.label}${m.id === defaultId ? '，默认' : ''}）：${m.description}`,
    ),
    '- 尺寸档位随所选模型而异；自定义 WIDTHxHEIGHT 需落在所选模型像素区间内',
  ].join('\n');
}

export function getImageModelProfile(modelId: string): ImageModelProfile | undefined {
  const normalized = modelId.trim();
  return listImageModels().find((item) => item.id === normalized);
}

/**
 * 解析用户显式选择的模型；不读取 IMAGE_MODEL_ID，供有固定模型下拉的工作台类入口使用。
 */
export function resolveExplicitImageModelId(requestedModelId: string | undefined): string | null {
  const normalized = requestedModelId?.trim();
  if (!normalized) return null;
  return getImageModelProfile(normalized) ? normalized : null;
}
