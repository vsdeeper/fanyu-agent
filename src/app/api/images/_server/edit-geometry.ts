import 'server-only';

import {
  getImageSpec,
  IMAGE_ASPECT_RATIO_AUTO,
  isValidImageSize,
  nearestSupportedAspectRatio,
} from './image-spec';
import { readDataUrlDimensions } from './image-utils';
import type { ImageGenerateRequest, ImageSpec } from './types';

/** 继承源图几何后要补的字段；不继承时返回空对象，provider 仍走原有默认档位。 */
export type InheritedEditGeometry = { size?: string; aspectRatio?: string };

/** 正整数判定：像素尺寸只接受正整数。 */
function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** 两个正整数的最大公约数，用于把源图尺寸约成最简宽高比。 */
function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/** 像素尺寸 → 最简宽高比串（1536x2048 → '3:4'）；宽高非法返回 undefined。 */
function toAspectRatio(width: number, height: number): string | undefined {
  if (!isPositiveInt(width) || !isPositiveInt(height)) return undefined;
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/**
 * 按源图反推改图可出站的几何参数：源图尺寸合法（落在模型像素区间内、符合对齐步长与最长边比例上限）
 * 时原样沿用其像素尺寸，否则只沿用宽高比、尺寸仍走模型默认档位。
 * 只认档位串的模型（Gemini native）无法按像素出图，故仅返回比例（吸附到最近的可选比例）。
 * 源图尺寸不可用返回 undefined。
 */
export function resolveInheritedEditGeometry(
  source: { width: number; height: number },
  spec: ImageSpec,
): { size?: string; aspectRatio: string } | undefined {
  const ratio = toAspectRatio(source.width, source.height);
  if (!ratio) return undefined;
  if (spec.sizeInput === 'tier') {
    return { aspectRatio: nearestSupportedAspectRatio(source.width / source.height) };
  }

  const multiple = spec.dimensionMultiple ?? 2;
  const aligned = source.width % multiple === 0 && source.height % multiple === 0;
  const longToShort = Math.max(source.width, source.height) / Math.min(source.width, source.height);
  const withinRatioCap = spec.maxAspectRatio == null || longToShort <= spec.maxAspectRatio;
  const exact = `${source.width}x${source.height}`;
  return aligned && withinRatioCap && isValidImageSize(exact, spec)
    ? { size: exact, aspectRatio: ratio }
    : { aspectRatio: ratio };
}

/**
 * 改图请求的几何归一：调用方未指定比例时，用首张参考图（源图）的像素尺寸补上 size / aspectRatio。
 * 起因：改图不带比例时，像素入参模型按默认档位出正方形（gpt-image 2K → 2048x2048），
 * 3:4 竖版源图会被改成方图；用户没要求改尺寸比例时应当保持源图原样。
 * 返回空对象表示不继承：非改图、无参考图、调用方已给比例、或源图尺寸读不出/非法。
 */
export function inheritEditSourceGeometry(
  req: ImageGenerateRequest,
  modelId: string,
): InheritedEditGeometry {
  if (req.mode !== 'edit') return {};
  // 调用方（主模型 / 工作室表单）已选定比例时以它为准，含 auto 以外的任何值
  const requestedRatio = req.aspectRatio?.trim().toLowerCase();
  if (requestedRatio && requestedRatio !== IMAGE_ASPECT_RATIO_AUTO) return {};
  const source = req.referenceImageDataUrls?.[0];
  if (!source) return {};
  const dimensions = readDataUrlDimensions(source);
  if (!dimensions) return {};

  const inherited = resolveInheritedEditGeometry(dimensions, getImageSpec(modelId));
  if (!inherited) return {};

  const geometry: InheritedEditGeometry = { aspectRatio: inherited.aspectRatio };
  // 尺寸同理只在调用方没给时继承；模型不接受源图像素尺寸时 inherited.size 为空，仍走默认档位
  if (!req.size?.trim() && inherited.size) geometry.size = inherited.size;
  return geometry;
}
