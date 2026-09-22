import { describe, expect, it } from 'vitest';

import { DEEPSEEK_IMAGE_DETAIL } from './constants';
import { patchDeepSeekRequestBody, type DeepSeekRequestBody } from './request-patch';

describe('patchDeepSeekRequestBody 识图 detail', () => {
  it('将未声明 detail 的 input_image 钉为 original', () => {
    const body: DeepSeekRequestBody = {
      input: [
        {
          role: 'user',
          type: 'message',
          content: [
            { type: 'input_text', text: '描述画面' },
            {
              type: 'input_image',
              image_url: 'data:image/png;base64,aaa',
            },
          ],
        },
      ],
    };

    expect(patchDeepSeekRequestBody(body)).toBe(true);

    const image = (body.input?.[0].content as Array<Record<string, unknown>>)[1];
    expect(image.detail).toBe(DEEPSEEK_IMAGE_DETAIL);
  });

  it('将 detail=high 覆盖为 original（analyze_image 路径）', () => {
    const body: DeepSeekRequestBody = {
      input: [
        {
          role: 'user',
          type: 'message',
          content: [
            {
              type: 'input_image',
              detail: 'high',
              image_url: 'data:image/png;base64,aaa',
            },
          ],
        },
      ],
    };

    expect(patchDeepSeekRequestBody(body)).toBe(true);

    const image = (body.input?.[0].content as Array<Record<string, unknown>>)[0];
    expect(image.detail).toBe(DEEPSEEK_IMAGE_DETAIL);
  });

  it('已是 original 时不重复标记改动（无 include/passback 时返回 false）', () => {
    const body: DeepSeekRequestBody = {
      input: [
        {
          role: 'user',
          type: 'message',
          content: [
            {
              type: 'input_image',
              detail: 'original',
              image_url: 'data:image/png;base64,aaa',
            },
          ],
        },
      ],
    };

    expect(patchDeepSeekRequestBody(body)).toBe(false);
    const image = (body.input?.[0].content as Array<Record<string, unknown>>)[0];
    expect(image.detail).toBe(DEEPSEEK_IMAGE_DETAIL);
  });
});
