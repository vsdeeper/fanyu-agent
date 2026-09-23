import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseBatchDeleteRequest, parseChatListQuery } from './parse-list-query';

describe('parseChatListQuery', () => {
  it('parses title and created range', () => {
    const url =
      'http://localhost/api/chats?title=测试&createdFrom=2026-01-01T00:00:00.000Z&createdTo=2026-01-31T23:59:59.999Z';
    expect(parseChatListQuery(url)).toEqual({
      title: '测试',
      createdFrom: '2026-01-01T00:00:00.000Z',
      createdTo: '2026-01-31T23:59:59.999Z',
    });
  });

  it('returns empty filters when no params', () => {
    expect(parseChatListQuery('http://localhost/api/chats')).toEqual({
      title: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
  });
});

describe('parseBatchDeleteRequest', () => {
  it('dedupes ids', () => {
    expect(parseBatchDeleteRequest({ ids: ['a', 'a', 'b'] })).toEqual({
      ids: ['a', 'b'],
    });
  });

  it('rejects empty ids', () => {
    expect(() => parseBatchDeleteRequest({ ids: [] })).toThrow();
  });
});
