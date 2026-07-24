/** AI SDK / 方舟 web_search 的近似用户位置 */
export type UserLocation = {
  type: 'approximate';
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
};

/** 模块级缓存：仅成功获取城市级位置时写入 */
let cached: UserLocation | null = null;

function fallbackLocation(): UserLocation {
  return {
    type: 'approximate',
    country: 'CN',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

/** 同步读缓存；提交路径用，避免 await 定位阻塞发送；失败时为 null */
export function getCachedUserLocation(): UserLocation | null {
  return cached;
}

/**
 * 获取城市级近似位置，供联网搜索使用。
 * 坑点：只把城市级结果交给 /api/chat，不把原始经纬度发给方舟，降低隐私风险。
 * 坑点：失败/拒绝不写 cached，提交侧不带假位置；无缓存则再走授权（调用方保证进页只触发一次）。
 */
export async function getUserLocation(): Promise<UserLocation> {
  if (cached) return cached;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const position = await readPosition();
    const { latitude, longitude } = position.coords;

    const res = await fetch('/api/geo/regeo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!res.ok) {
      return fallbackLocation();
    }

    const data = (await res.json()) as Omit<UserLocation, 'timezone'> & {
      timezone?: string;
    };

    if (data?.type !== 'approximate') {
      return fallbackLocation();
    }

    cached = {
      type: 'approximate',
      country: data.country,
      city: data.city,
      region: data.region,
      timezone: data.timezone ?? timezone,
    };
    return cached;
  } catch {
    return fallbackLocation();
  }
}
