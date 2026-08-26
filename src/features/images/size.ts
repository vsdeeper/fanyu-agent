import type { ImageSizeSpec } from './types';

/** 当前生图模型；换接入点改此 ID，并更新本表对应规格（presets / 像素上下限） */
export const CURRENT_IMAGE_MODEL_ID = 'doubao-seedream-5-0-lite-260128';

/** 模型 ID → 尺寸规格。新增模型须同时改 registry 与本表，勿只改一处。 */
export const IMAGE_SIZE_BY_MODEL_ID: Record<string, ImageSizeSpec> = {
  [CURRENT_IMAGE_MODEL_ID]: {
    presets: ['2K', '4K'],
    minPixels: 3_686_400, // 1920×1920，Seedream 可出图下限
    maxPixels: 4096 * 4096,
    defaultSize: '2K',
  },
};

/**
 * 按模型 ID 取尺寸规格。未登记则抛错，避免漏配时套用其他模型档位。
 */
export function getSizeSpec(modelId: string): ImageSizeSpec {
  const spec = IMAGE_SIZE_BY_MODEL_ID[modelId.trim()];
  if (!spec) {
    throw new Error(`未登记生图尺寸规格: ${modelId}`);
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
function matchPreset(value: string, spec: ImageSizeSpec): string | undefined {
  const upper = value.trim().toUpperCase();
  return spec.presets.find((preset) => preset.toUpperCase() === upper);
}

/**
 * 校验 size 是否可出站：预设档位，或 spec 有像素上下限时落在区间内的 WxH。
 * 无像素区间的模型只接受预设，自定义 WxH 视为非法。
 */
export function isValidImageSize(value: string, spec: ImageSizeSpec): boolean {
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
export function normalizeImageSize(size: string | undefined, spec: ImageSizeSpec): string {
  if (!size) return spec.defaultSize;
  const trimmed = size.trim();
  const preset = matchPreset(trimmed, spec);
  if (preset) return preset;
  if (isValidImageSize(trimmed, spec)) return trimmed;
  return spec.defaultSize;
}

/** 生成工具 schema / HINT 用的尺寸说明文案 */
export function describeImageSize(spec: ImageSizeSpec): string {
  const presets = spec.presets.join('、');
  if (spec.minPixels != null && spec.maxPixels != null) {
    return `可选尺寸：${presets}（默认 ${spec.defaultSize}），或自定义 WIDTHxHEIGHT（总像素 ${spec.minPixels} ~ ${spec.maxPixels}，如 2048x2048）；勿使用过小尺寸`;
  }
  return `可选尺寸：${presets}（默认 ${spec.defaultSize}）`;
}
