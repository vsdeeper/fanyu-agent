import { describe, expect, it } from 'vitest';

import { normalizeArkResponseJsonBody } from './sse';

describe('normalizeArkResponseJsonBody', () => {
  it('为缺省的 annotations 补空数组', () => {
    const raw = JSON.stringify({
      output: [
        { type: 'reasoning', summary: [] },
        {
          type: 'message',
          content: [{ type: 'output_text', text: '画面有一只猫' }],
        },
      ],
    });

    const normalized = JSON.parse(normalizeArkResponseJsonBody(raw)) as {
      output: Array<{ content?: Array<{ annotations?: unknown; text?: string }> }>;
    };

    expect(normalized.output[1].content?.[0].annotations).toEqual([]);
    expect(normalized.output[1].content?.[0].text).toBe('画面有一只猫');
  });

  it('已有 annotations 时不覆盖', () => {
    const raw = JSON.stringify({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'hi',
              annotations: [{ type: 'url_citation', url: 'https://a.example' }],
            },
          ],
        },
      ],
    });

    const normalized = JSON.parse(normalizeArkResponseJsonBody(raw)) as {
      output: Array<{ content?: Array<{ annotations?: unknown[] }> }>;
    };

    expect(normalized.output[0].content?.[0].annotations).toEqual([
      { type: 'url_citation', url: 'https://a.example' },
    ]);
  });

  it('非法 JSON 原样返回', () => {
    expect(normalizeArkResponseJsonBody('not-json')).toBe('not-json');
  });
});
