// 修复：方舟 Seedream 对 size 有最小像素限制（doubao-seedream-4-5 为 3,686,400）。
// 工具层 schema 与 Provider 层共用此校验，避免 `1024x1024` 等过小尺寸透传给上游导致 400。

export const DEFAULT_IMAGE_SIZE = '2K';

/** 方舟 Seedream 最小像素总量（2560x1440 ≈ 1920x1920 = 3,686,400） */
export const ARK_SEEDREAM_MIN_PIXELS = 3_686_400;

/** 方舟 Seedream 最大像素总量（4096x4096 = 16,777,216） */
export const ARK_SEEDREAM_MAX_PIXELS = 4096 * 4096;

/** 分辨率预设：4.5 支持 2K / 4K（1K 像素过小，不提供） */
export const ARK_SEEDREAM_SIZE_PRESETS = ['2K', '4K'] as const;
export type ArkSeedreamSizePreset = (typeof ARK_SEEDREAM_SIZE_PRESETS)[number];

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

/** 该 size 是否合法：2K/4K 预设，或像素总量在 [MIN, MAX] 内 */
export function isValidSeedreamSize(value: string): boolean {
  const trimmed = value.trim();
  if ((ARK_SEEDREAM_SIZE_PRESETS as readonly string[]).includes(trimmed)) return true;
  const dims = parsePixelSize(trimmed);
  if (!dims) return false;
  const pixels = dims.width * dims.height;
  return pixels >= ARK_SEEDREAM_MIN_PIXELS && pixels <= ARK_SEEDREAM_MAX_PIXELS;
}

/** 归一化：缺省或非法 size 一律回退到 2K，保证上游不再 400 */
export function normalizeSeedreamSize(size: string | undefined): string {
  if (size && isValidSeedreamSize(size)) return size.trim();
  return DEFAULT_IMAGE_SIZE;
}
