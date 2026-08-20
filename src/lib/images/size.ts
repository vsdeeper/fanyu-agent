import type { ImageSizeSpec } from './types';

/** 当前生图模型；换接入点改此处并同步 IMAGE_SIZE_BY_MODEL_ID 的 key */
export const CURRENT_IMAGE_MODEL_ID = 'doubao-seedream-5-0-lite-260128';

/** 模型 ID → 尺寸规格。新增模型须同时改 registry 与本表。 */
export const IMAGE_SIZE_BY_MODEL_ID: Record<string, ImageSizeSpec> = {
  [CURRENT_IMAGE_MODEL_ID]: {
    presets: ['2K', '4K'],
    minPixels: 3_686_400,
    maxPixels: 4096 * 4096,
    defaultSize: '2K',
  },
  // Flux 占位，接通 Provider 时按官方文档替换
  'gpt-image-2': { presets: ['1K', '2K'], defaultSize: '2K' },
  'flux-kontext-pro': { presets: ['1K', '2K'], defaultSize: '2K' },
};

/**
 * 查模型尺寸规格；未登记则抛错，避免漏配时套用错误档位。
 */
export function getSizeSpec(modelId: string): ImageSizeSpec {
  const spec = IMAGE_SIZE_BY_MODEL_ID[modelId.trim()];
  if (!spec) {
    throw new Error(`未登记生图尺寸规格: ${modelId}`);
  }
  return spec;
}

/** 解析 `WIDTHxHEIGHT` 像素尺寸；格式非法返回 null */
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

/** 是否为该 spec 允许的预设档位（大小写不敏感） */
function matchPreset(value: string, spec: ImageSizeSpec): string | undefined {
  const upper = value.trim().toUpperCase();
  return spec.presets.find((preset) => preset.toUpperCase() === upper);
}

/** 该 size 是否符合 spec：预设档位，或（有像素上下限时）区间内的 WxH */
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
 * 归一化 size：合法则原样（预设统一成 spec 中的写法），否则回退 spec.defaultSize。
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

/** 供工具 schema / HINT 使用的尺寸说明 */
export function describeImageSize(spec: ImageSizeSpec): string {
  const presets = spec.presets.join('、');
  if (spec.minPixels != null && spec.maxPixels != null) {
    return `可选尺寸：${presets}（默认 ${spec.defaultSize}），或自定义 WIDTHxHEIGHT（总像素 ${spec.minPixels} ~ ${spec.maxPixels}，如 2048x2048）；勿使用过小尺寸`;
  }
  return `可选尺寸：${presets}（默认 ${spec.defaultSize}）`;
}
