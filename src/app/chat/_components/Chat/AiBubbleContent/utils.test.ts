import { describe, expect, it } from 'vitest';
import { getSourceItems } from './utils';
import type { MessagePart } from './utils';

function sourceUrl(url: string, title: string, sourceId: string): MessagePart {
  return { type: 'source-url', url, title, sourceId };
}

function webSearchResults(
  results: Array<{ link: string; title?: string; content?: string; publishDate?: string }>,
): MessagePart {
  return {
    type: 'tool-web_search',
    state: 'output-available',
    output: { ok: true, results },
  };
}

describe('getSourceItems', () => {
  it('已有 source-url 时不把同域其它 results 并进列表，仍按 URL 补摘要与日期', () => {
    const items = getSourceItems(
      [
        sourceUrl('https://example.com/a', 'A', 's1'),
        webSearchResults([
          {
            link: 'https://example.com/a',
            title: 'A',
            content: '摘要 A',
            publishDate: '2024-01-15',
          },
          { link: 'https://example.com/b', title: 'B', content: '摘要 B' },
        ]),
      ],
      '正文',
    );

    expect(items).toEqual([
      {
        key: 's1',
        title: 'A',
        url: 'https://example.com/a',
        snippet: '摘要 A',
        publishDate: '2024-01-15',
      },
    ]);
  });

  it('无 source-url 时用 results 做列表', () => {
    const items = getSourceItems(
      [
        webSearchResults([
          { link: 'https://news.example/1', title: '新闻一' },
          { link: 'https://news.example/2', title: '新闻二' },
        ]),
      ],
      '正文',
    );

    expect(items.map((item) => item.url)).toEqual([
      'https://news.example/1',
      'https://news.example/2',
    ]);
    expect(items[0]).toMatchObject({ title: '新闻一', key: 'https://news.example/1' });
  });

  it('跳过 javascript: 与 data: URL', () => {
    const items = getSourceItems(
      [
        sourceUrl('javascript:alert(1)', 'xss', 'bad1'),
        sourceUrl('data:text/html,hi', 'data', 'bad2'),
        sourceUrl('https://safe.example/', '安全', 'ok'),
      ],
      '正文',
    );

    expect(items.map((item) => item.url)).toEqual(['https://safe.example/']);
  });

  it('参考来源 Markdown 区块优先于 parts', () => {
    const text = ['结论。', '', '**参考来源：**', '', '[标题](https://md.example/page)'].join('\n');

    const items = getSourceItems([sourceUrl('https://ignored.example/', '忽略', 's1')], text);

    expect(items.map((item) => item.url)).toEqual(['https://md.example/page']);
    expect(items[0]?.title).toBe('标题');
  });
});
