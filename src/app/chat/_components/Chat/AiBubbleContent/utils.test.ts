import { describe, expect, it } from 'vitest';
import { contentPartsKey, getContentBlocks, getSourceItems, stripReferenceSection } from './utils';
import type { MessagePart } from './utils';

function reasoning(text: string, state: 'streaming' | 'done' = 'done'): MessagePart {
  return { type: 'reasoning', text, state };
}

function text(body: string, state: 'streaming' | 'done' = 'done'): MessagePart {
  return { type: 'text', text: body, state };
}

function stepStart(): MessagePart {
  return { type: 'step-start' };
}

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

describe('getContentBlocks', () => {
  it('按 parts 顺序把连续同类 part 聚成「思考-正文-思考-正文」，key 取块内首个 part 下标', () => {
    const blocks = getContentBlocks([
      stepStart(),
      reasoning('想一'),
      text('答一'),
      stepStart(),
      reasoning('想二'),
      text('答二'),
    ]);

    expect(blocks.map((block) => block.kind)).toEqual(['reasoning', 'text', 'reasoning', 'text']);
    expect(blocks.map((block) => block.key)).toEqual([
      'reasoning:1',
      'text:2',
      'reasoning:4',
      'text:5',
    ]);
    expect(blocks.map((block) => block.text)).toEqual(['想一', '答一', '想二', '答二']);
  });

  it('step-start 不切断块：网关横幅 reasoning 与其后的真实思考并成一块', () => {
    const blocks = getContentBlocks([
      reasoning('当前执行模型: mini'),
      stepStart(),
      reasoning('真正的思考'),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe('当前执行模型: mini真正的思考');
  });

  it('工具调用结束当前块，其前后两段思考各自成块', () => {
    const blocks = getContentBlocks([
      stepStart(),
      reasoning('先搜索'),
      { type: 'tool-web_search', state: 'output-available' },
      reasoning('看结果'),
    ]);

    expect(blocks.map((block) => [block.kind, block.text])).toEqual([
      ['reasoning', '先搜索'],
      ['reasoning', '看结果'],
    ]);
  });

  it('streaming 取块内最后一个 part 的状态', () => {
    const stillStreaming = getContentBlocks([
      reasoning('前半', 'done'),
      reasoning('后半', 'streaming'),
    ]);
    const finished = getContentBlocks([reasoning('前半', 'streaming'), reasoning('后半', 'done')]);

    expect(stillStreaming).toHaveLength(1);
    expect(stillStreaming[0]?.streaming).toBe(true);
    expect(finished).toHaveLength(1);
    expect(finished[0]?.streaming).toBe(false);
  });

  it('丢弃全空白块，忽略无正文的 part', () => {
    const blocks = getContentBlocks([
      stepStart(),
      reasoning('   \n  '),
      text(''),
      { type: 'source-url', url: 'https://example.com/', sourceId: 's1' },
      { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,xx' },
      text('正式回答'),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe('正式回答');
  });

  it('无 parts 或只有非正文 part 时返回空数组', () => {
    expect(getContentBlocks(undefined)).toEqual([]);
    expect(getContentBlocks([stepStart(), { type: 'tool-generate_image' }])).toEqual([]);
  });
});

describe('contentPartsKey', () => {
  it('聚合串相同但切分不同时 key 不同', () => {
    expect(contentPartsKey([text('ab')])).not.toBe(contentPartsKey([text('a'), text('b')]));
  });

  it('文本长度或 state 变化都会改变 key', () => {
    const base = [reasoning('想', 'streaming')];

    expect(contentPartsKey(base)).not.toBe(contentPartsKey([reasoning('想了', 'streaming')]));
    expect(contentPartsKey(base)).not.toBe(contentPartsKey([reasoning('想', 'done')]));
  });

  it('忽略非 text / reasoning part', () => {
    expect(
      contentPartsKey([stepStart(), { type: 'tool-generate_image', state: 'output-error' }]),
    ).toBe('');
  });
});

describe('stripReferenceSection', () => {
  it('只裁最后一个「参考来源」标题及之后内容，正文中提及的保留', () => {
    const content = ['尽量少出现**参考来源：**字样。', '', '正文结论。', '', '**参考来源：**'].join(
      '\n',
    );

    expect(stripReferenceSection(content)).toBe(
      ['尽量少出现**参考来源：**字样。', '', '正文结论。'].join('\n'),
    );
  });
});
