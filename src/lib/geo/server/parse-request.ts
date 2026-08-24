import 'server-only';

import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';

import type { UserLocation } from '../types';

/** 仅接受 approximate + 已知可选字符串字段，忽略非法结构 */
export function parseUserLocation(value: unknown): UserLocation | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  if (raw.type !== 'approximate') return undefined;

  const pick = (key: string): string | undefined => {
    const v = raw[key];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };

  return {
    type: 'approximate',
    ...(pick('country') ? { country: pick('country') } : {}),
    ...(pick('city') ? { city: pick('city') } : {}),
    ...(pick('region') ? { region: pick('region') } : {}),
    ...(pick('timezone') ? { timezone: pick('timezone') } : {}),
  };
}

export type RegeoBody = {
  latitude: number;
  longitude: number;
};

export async function parseRegeoBody(req: Request): Promise<RegeoBody | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '无效 JSON', 400);
  }

  const { latitude, longitude } = (body ?? {}) as {
    latitude?: unknown;
    longitude?: unknown;
  };

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '经纬度参数无效', 400);
  }

  return { latitude, longitude };
}
