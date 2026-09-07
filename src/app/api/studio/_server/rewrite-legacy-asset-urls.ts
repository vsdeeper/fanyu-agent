import 'server-only';

const LEGACY_ASSET_PREFIXES = [
  ['/api/ecommerce/', '/api/studio/ecommerce/'],
  ['/api/product-model/', '/api/studio/product-model/'],
  ['/api/product-retouch/', '/api/studio/product-retouch/'],
] as const;

/** 将历史快照中的旧任务资产 URL 改写为 /api/studio/{product}/ 前缀。 */
export function rewriteLegacyStudioAssetUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    let next = value;
    for (const [from, to] of LEGACY_ASSET_PREFIXES) {
      if (next.includes(from)) next = next.split(from).join(to);
    }
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLegacyStudioAssetUrls(item));
  }
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      rewriteLegacyStudioAssetUrls(child),
    ]),
  );
}
