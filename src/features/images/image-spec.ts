import type { ImageSpec } from './types';

/** 当前生图模型；换接入点改此 ID，并更新本表对应规格（presets / 像素上下限） */
export const CURRENT_IMAGE_MODEL_ID = 'gpt-image-2-vip';

/** 模型 ID → 生图输出规格。新增模型须同时改 registry 与本表，勿只改一处。 */
export const IMAGE_SPEC_BY_MODEL_ID: Record<string, ImageSpec> = {
  'gemini-3.1-flash-lite-image': {
    // 恒定 1K（实测 2K/4K 档位仍返回 1024×1024）。不配 minPixels/maxPixels：
    // 该模型只认档位串，配了像素上下限会让 describeImageSize/isValidImageSize 误宣传「支持自定义 WIDTHxHEIGHT」，
    // 而 laozhang 端只会把自定义 WxH 静默回退成 '1K'。
    presets: ['1K'],
    defaultSize: '1K',
  },
  'doubao-seedream-4-5-251128': {
    presets: ['2K', '4K'],
    minPixels: 3_686_400, // 1920×1920，Seedream 可出图下限
    maxPixels: 4096 * 4096,
    defaultSize: '2K',
    // 方舟 Seedream 4.5 不支持 `output_format`（png/jpeg），传则 400 InvalidParameter；
    // 不支持透明参数时，透明背景交由 prompt 后缀表达。
    supportsOutputFormat: false,
  },
  'doubao-seedream-5-0-lite-260128': {
    presets: ['2K', '4K'],
    minPixels: 3_686_400, // 1920×1920，Seedream 可出图下限
    maxPixels: 4096 * 4096,
    defaultSize: '2K',
  },
  'gpt-image-2-vip': {
    // presets 沿用档位串（与 Seedream 一致）；该模型按像素入参，故配像素区间以启用自定义 WIDTHxHEIGHT 与比例换算。
    presets: ['1K', '2K', '4K'],
    minPixels: 1024 * 1024,
    maxPixels: 3840 * 2160,
    defaultSize: '2K',
  },
};

/** 生图宽高比：'auto' 表示交给模型自选（不传上游），其余为可用比例。 */
export const IMAGE_ASPECT_RATIO_AUTO = 'auto';
export const IMAGE_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16'] as const;

/** K 档位 → 标准基准分辨率。按像素（WxH）入参的模型（Seedream / gpt-image 等）以此换算默认/档位尺寸。 */
export const K_SIZE_BY_TIER: Record<string, string> = {
  '1K': '1024x1024',
  '2K': '2048x2048',
  '4K': '4096x4096',
};

/**
 * 把宽高比串（如 '3:2'）换算成模型可出站的 WIDTHxHEIGHT。
 * 在给定基准面积内按比例放缩、偶数对齐，并夹在 spec 的 [minPixels, maxPixels] 区间内；
 * 比例非法或超出上限返回 undefined（交回原 size）。
 * 方舟 / gpt-image 等上游只认 WIDTHxHEIGHT（不接受 '3:2' 这类比例串），故先在此换算出像素宽高。
 */
export function aspectRatioToSize(
  ratio: string,
  spec: ImageSpec,
  targetArea = spec.minPixels ?? 3_686_400,
): string | undefined {
  const m = /^(\d+):(\d+)$/.exec(ratio.trim());
  if (!m) return undefined;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (w <= 0 || h <= 0) return undefined;
  const minArea = spec.minPixels ?? 0;
  const maxArea = spec.maxPixels ?? Number.MAX_SAFE_INTEGER;
  const area = Math.min(Math.max(targetArea, minArea), maxArea);
  const scale = Math.sqrt(area / (w * h));
  let pw = Math.max(1, Math.round(w * scale));
  let ph = Math.max(1, Math.round(h * scale));
  if (pw % 2) pw += 1;
  if (ph % 2) ph += 1;
  if (pw * ph < area) {
    pw += 2;
    ph += 2;
  }
  if (spec.maxPixels != null && pw * ph > spec.maxPixels) return undefined;
  return `${pw}x${ph}`;
}

/**
 * 解析按像素入参模型（Seedream / gpt-image 等）的可出站尺寸：把 size/defaultSize 的 K 档位先转成基准 WxH，
 * 无比例（'auto'/省略）直接返回基准 WxH，有比例则按基准面积 reshape。
 * 即「K 档位 → WxH → 结合比例」的统一入口；与档位串直传的 Gemini 路径（imageSize）不同。
 */
export function resolveImageSize(
  size: string | undefined,
  aspectRatio: string | undefined,
  spec: ImageSpec,
): string {
  const base = size?.trim() || spec.defaultSize;
  const baseDims = parsePixelSize(base);
  const baseSize = baseDims ? base : (K_SIZE_BY_TIER[base.toUpperCase()] ?? spec.defaultSize);
  const dims = parsePixelSize(baseSize);
  if (!aspectRatio || aspectRatio === IMAGE_ASPECT_RATIO_AUTO) {
    // 修复：无比例分支也做 min/max 边界校验，避免非法尺寸（低于 minPixels / 高于 maxPixels）在上游 400。
    // 复用 aspectRatioToSize 按基准比例裁剪到区间内（自带裁剪 + 偶数对齐）；合法值原样，越界则回退裁剪值。
    const safe =
      dims && (spec.minPixels != null || spec.maxPixels != null)
        ? aspectRatioToSize(`${dims.width}:${dims.height}`, spec, dims.width * dims.height)
        : undefined;
    return safe ?? baseSize;
  }
  if (!dims) return baseSize;
  return aspectRatioToSize(aspectRatio, spec, dims.width * dims.height) ?? baseSize;
}

/**
 * 按模型 ID 取生图输出规格。未登记则抛错，避免漏配时套用其他模型档位。
 */
export function getImageSpec(modelId: string): ImageSpec {
  const spec = IMAGE_SPEC_BY_MODEL_ID[modelId.trim()];
  if (!spec) {
    throw new Error(`未登记生图输出规格: ${modelId}`);
  }
  return spec;
}

/** 解析 WIDTHxHEIGHT；非法或非正整数返回 null */
export function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

/** 匹配 spec 预设档位；大小写不敏感，返回 spec 中的规范写法 */
function matchPreset(value: string, spec: ImageSpec): string | undefined {
  const upper = value.trim().toUpperCase();
  return spec.presets.find((preset) => preset.toUpperCase() === upper);
}

/**
 * 校验 size 是否可出站：预设档位，或 spec 有像素上下限时落在区间内的 WxH。
 * 无像素区间的模型只接受预设，自定义 WxH 视为非法。
 */
export function isValidImageSize(value: string, spec: ImageSpec): boolean {
  const trimmed = value.trim();
  if (matchPreset(trimmed, spec)) return true;
  const dims = parsePixelSize(trimmed);
  if (!dims) return false;
  if (spec.minPixels == null || spec.maxPixels == null) return false;
  const pixels = dims.width * dims.height;
  return pixels >= spec.minPixels && pixels <= spec.maxPixels;
}

/** 生成工具 schema / HINT 用的尺寸说明文案 */
export function describeImageSize(spec: ImageSpec): string {
  const presets = spec.presets.join('、');
  if (spec.minPixels != null && spec.maxPixels != null) {
    return `可选尺寸：${presets}（默认 ${spec.defaultSize}），或自定义 WIDTHxHEIGHT（总像素 ${spec.minPixels} ~ ${spec.maxPixels}）`;
  }
  // 固定尺寸模型：仅单一档位、无像素区间（如 gemini-flash 恒定 1K），size 实际不可选，可控的是宽高比。
  if (spec.presets.length <= 1) {
    return `尺寸固定为 ${spec.defaultSize}；构图控制请用宽高比（aspectRatio，如 3:2、16:9）`;
  }
  return `可选尺寸：${presets}（默认 ${spec.defaultSize}）`;
}
