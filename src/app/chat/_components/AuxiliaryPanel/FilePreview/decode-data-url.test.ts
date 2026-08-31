import { describe, expect, it } from 'vitest';
import { decodeDataUrlText } from './decode-data-url';

describe('decodeDataUrlText', () => {
  it('解码 base64 data URL', () => {
    expect(decodeDataUrlText('data:text/plain;base64,aGk=')).toBe('hi');
  });

  it('解码非 base64 data URL', () => {
    expect(decodeDataUrlText('data:text/plain,hello%20world')).toBe('hello world');
  });

  it('非法 data URL 抛错', () => {
    expect(() => decodeDataUrlText('not-a-data-url')).toThrow('invalid data url');
  });
});
