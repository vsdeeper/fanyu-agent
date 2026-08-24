import 'server-only';

import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { requireEnv } from '@/lib/shared/server/env';

import type { UserLocation } from '../types';

/** 高德中文国名 → ISO 3166-1 alpha-2；未知默认 CN（本项目主要服务国内） */
const COUNTRY_TO_ISO: Record<string, string> = {
  中国: 'CN',
  中华人民共和国: 'CN',
};

/**
 * 修复：高德空字段常返回 [] 而非 "" / null，直接当 string 用会异常。
 */
function amapText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function toIsoCountry(country: string | undefined): string {
  if (!country) return 'CN';
  return COUNTRY_TO_ISO[country] ?? (country.length === 2 ? country.toUpperCase() : 'CN');
}

type AmapRegeoResponse = {
  status?: string;
  info?: string;
  regeocode?: {
    addressComponent?: {
      country?: unknown;
      province?: unknown;
      city?: unknown;
      district?: unknown;
    };
  };
};

/** 经纬度逆地理编码，返回近似用户位置 */
export async function regeoFromCoordinates(latitude: number, longitude: number): Promise<Response> {
  const key = requireEnv('AMAP_WEB_KEY');

  // 修复：高德 location 为「经度,纬度」，小数点后不超过 6 位
  const location = `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
  const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
  url.searchParams.set('key', key);
  url.searchParams.set('location', location);
  url.searchParams.set('extensions', 'base');
  url.searchParams.set('output', 'JSON');

  // 修复：浏览器 Geolocation 多为 WGS-84，高德默认 GCJ-02；城市级偏差通常可接受，故不做坐标转换
  let amap: AmapRegeoResponse;
  try {
    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      return jsonFail(ApiErrorCode.AMAP_UPSTREAM, '高德请求失败', 502);
    }
    amap = (await res.json()) as AmapRegeoResponse;
  } catch {
    return jsonFail(ApiErrorCode.AMAP_UPSTREAM, '高德网络错误', 502);
  }

  if (amap.status !== '1') {
    return jsonFail(ApiErrorCode.AMAP_UPSTREAM, '无法解析位置信息', 502);
  }

  const component = amap.regeocode?.addressComponent;
  const province = amapText(component?.province);
  // 修复：直辖市 city 常为空 / []，用 province 兜底
  const city = amapText(component?.city) ?? province;
  const country = toIsoCountry(amapText(component?.country));

  const userLocation: UserLocation = {
    type: 'approximate',
    country,
    ...(city ? { city } : {}),
    ...(province ? { region: province } : {}),
  };

  return jsonOk(userLocation);
}
