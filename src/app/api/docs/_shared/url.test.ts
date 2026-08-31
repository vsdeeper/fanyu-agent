import { describe, expect, it } from 'vitest';
import { isDocAssetHref } from './url';

const ORIGIN = 'http://localhost:3000';

describe('isDocAssetHref', () => {
  it('接受相对路径 /api/docs/:chatId/:assetId', () => {
    expect(isDocAssetHref('/api/docs/chat1/asset1', ORIGIN)).toBe(true);
    expect(isDocAssetHref('/api/docs/chat1/asset1/', ORIGIN)).toBe(true);
  });

  it('接受同源绝对 URL', () => {
    expect(isDocAssetHref('http://localhost:3000/api/docs/chat1/asset1', ORIGIN)).toBe(true);
  });

  it('拒绝跨源与协议相对地址', () => {
    expect(isDocAssetHref('https://evil.example/api/docs/chat1/asset1', ORIGIN)).toBe(false);
    expect(isDocAssetHref('http://evil.example/api/docs/chat1/asset1', ORIGIN)).toBe(false);
    expect(isDocAssetHref('//evil.example/api/docs/chat1/asset1', ORIGIN)).toBe(false);
  });

  it('拒绝 path traversal 与非文档路径', () => {
    expect(isDocAssetHref('/api/docs/../secrets', ORIGIN)).toBe(false);
    expect(isDocAssetHref('/api/chats/chat1', ORIGIN)).toBe(false);
    expect(isDocAssetHref('/api/docs/chat1', ORIGIN)).toBe(false);
    expect(isDocAssetHref('/api/docs/chat1/asset1/extra', ORIGIN)).toBe(false);
  });

  it('忽略 query 与 hash，只校验 pathname', () => {
    expect(isDocAssetHref('/api/docs/chat1/asset1?download=1', ORIGIN)).toBe(true);
    expect(isDocAssetHref('/api/docs/chat1/asset1#section', ORIGIN)).toBe(true);
  });

  it('无 origin 且非浏览器时拒绝', () => {
    expect(isDocAssetHref('/api/docs/chat1/asset1')).toBe(false);
  });
});
