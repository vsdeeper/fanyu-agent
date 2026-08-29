import type { ImageSpec } from './types';

/** 当前生图模型；换接入点改此 ID，并更新本表对应规格（presets / 像素上下限） */
export const CURRENT_IMAGE_MODEL_ID = 'gemini-3.1-flash-lite-image';

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
};

/** 生图宽高比：'auto' 表示交给模型自选（不传上游），其余为可用比例。 */
export const IMAGE_ASPECT_RATIO_AUTO = 'auto';
export const IMAGE_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16'] as const;

/**
 * 把宽高比串（如 '3:2'）换算成模型可出站的 WIDTHxHEIGHT。
 * 以模型像素下限为基准放缩、偶数对齐，保证落在 spec 的像素区间内；比例非法或超出上限返回 undefined（交回原 size）。
 * 方舟等上游只认 WIDTHxHEIGHT / 档位（不接受 '3:2' 这类比例串），故先在此换算出像素宽高。
 */
export function aspectRatioToSize(ratio: string, spec: ImageSpec): string | undefined {
  const m = /^(\d+):(\d+)$/.exec(ratio.trim());
  if (!m) return undefined;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (w <= 0 || h <= 0) return undefined;
  const targetArea = spec.minPixels ?? 3_686_400;
  const scale = Math.sqrt(targetArea / (w * h));
  let pw = Math.max(1, Math.round(w * scale));
  let ph = Math.max(1, Math.round(h * scale));
  if (pw % 2) pw += 1;
  if (ph % 2) ph += 1;
  if (pw * ph < targetArea) {
    pw += 2;
    ph += 2;
  }
  if (spec.maxPixels != null && pw * ph > spec.maxPixels) return undefined;
  return `${pw}x${ph}`;
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

/**
 * 将 size 规范为可出站值：预设统一成 spec 写法，合法 WxH 原样，否则 defaultSize。
 * 修复：过小尺寸（如 1024x1024）透传上游会 400，非法值不得出站。
 */
export function normalizeImageSize(size: string | undefined, spec: ImageSpec): string {
  if (!size) return spec.defaultSize;
  const trimmed = size.trim();
  const preset = matchPreset(trimmed, spec);
  if (preset) return preset;
  if (isValidImageSize(trimmed, spec)) return trimmed;
  return spec.defaultSize;
}

/** 生成工具 schema / HINT 用的尺寸说明文案 */
export function describeImageSize(spec: ImageSpec): string {
  const presets = spec.presets.join('、');
  if (spec.minPixels != null && spec.maxPixels != null) {
    return `可选尺寸：${presets}（默认 ${spec.defaultSize}），或自定义 WIDTHxHEIGHT（总像素 ${spec.minPixels} ~ ${spec.maxPixels}）`;
  }
  return `可选尺寸：${presets}（默认 ${spec.defaultSize}）`;
}
