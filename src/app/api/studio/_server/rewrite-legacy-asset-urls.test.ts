import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { rewriteLegacyStudioAssetUrls } from './rewrite-legacy-asset-urls';

describe('rewriteLegacyStudioAssetUrls', () => {
  it('把三套旧资产前缀改写为 /api/studio/{product}/', () => {
    expect(
      rewriteLegacyStudioAssetUrls({
        ecommerce: '/api/ecommerce/tasks/t1/assets/a1',
        model: '/api/product-model/tasks/t2/assets/a2',
        retouch: '/api/product-retouch/tasks/t3/assets/a3',
      }),
    ).toEqual({
      ecommerce: '/api/studio/ecommerce/tasks/t1/assets/a1',
      model: '/api/studio/product-model/tasks/t2/assets/a2',
      retouch: '/api/studio/product-retouch/tasks/t3/assets/a3',
    });
  });

  it('已是 /api/studio 前缀的 URL 不再改写', () => {
    const snapshot = {
      images: [{ previewUrl: '/api/studio/ecommerce/tasks/t1/assets/old' }],
    };
    expect(rewriteLegacyStudioAssetUrls(snapshot)).toEqual(snapshot);
  });

  it('递归处理数组且忽略非 URL 字符串', () => {
    expect(
      rewriteLegacyStudioAssetUrls(['ok', { url: '/api/ecommerce/tasks/t/assets/a' }]),
    ).toEqual(['ok', { url: '/api/studio/ecommerce/tasks/t/assets/a' }]);
  });
});
