import { describe, expect, it } from 'vitest';
import { formatPublishDate } from './utils';

describe('formatPublishDate', () => {
  it('纯日期短横线换成斜杠', () => {
    expect(formatPublishDate('2024-01-15')).toBe('2024/01/15');
  });

  it('带 T 的 ISO 只保留日期', () => {
    expect(formatPublishDate('2024-01-15T10:30:00Z')).toBe('2024/01/15');
  });

  it('无法解析则原样', () => {
    expect(formatPublishDate('2024/01/15')).toBe('2024/01/15');
    expect(formatPublishDate('昨天')).toBe('昨天');
  });
});
