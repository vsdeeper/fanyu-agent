import { describe, expect, it } from 'vitest';
import { formatChapterPrefix, stripChapterPrefix, toChineseNumeral } from './utils';

describe('toChineseNumeral', () => {
  it('转换 1–20 与整十', () => {
    expect(toChineseNumeral(1)).toBe('一');
    expect(toChineseNumeral(10)).toBe('十');
    expect(toChineseNumeral(11)).toBe('十一');
    expect(toChineseNumeral(20)).toBe('二十');
    expect(toChineseNumeral(21)).toBe('二十一');
  });
});

describe('formatChapterPrefix', () => {
  it('按序号生成第N章', () => {
    expect(formatChapterPrefix(1)).toBe('第一章');
    expect(formatChapterPrefix(12)).toBe('第十二章');
  });
});

describe('stripChapterPrefix', () => {
  it('去掉中文或数字章前缀', () => {
    expect(stripChapterPrefix('第一章　钥匙')).toBe('钥匙');
    expect(stripChapterPrefix('第12章 旧址')).toBe('旧址');
    expect(stripChapterPrefix('钥匙')).toBe('钥匙');
  });
});
