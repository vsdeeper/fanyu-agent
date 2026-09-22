import { describe, expect, it } from 'vitest';

import { ARK_VISION_MAX_PIXELS, ARK_VISION_MIN_PIXELS } from './constants';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';

describe('patchArkRequestBody 识图高精度', () => {
  it('将 input_image detail=high 升为 xhigh 并写入最大像素上限', () => {
    const body: ArkRequestBody = {
      input: [
        {
          role: 'user',
          type: 'message',
          content: [
            { type: 'input_text', text: '描述画面' },
            {
              type: 'input_image',
              detail: 'high',
              image_url: 'data:image/png;base64,aaa',
            },
          ],
        },
      ],
    };

    expect(patchArkRequestBody(body)).toBe(true);

    const image = (body.input?.[0].content as Array<Record<string, unknown>>)[1];
    expect(image.detail).toBe('xhigh');
    expect(image.image_pixel_limit).toEqual({
      max_pixels: ARK_VISION_MAX_PIXELS,
      min_pixels: ARK_VISION_MIN_PIXELS,
    });
  });

  it('未声明 high 的图片不改动', () => {
    const body: ArkRequestBody = {
      input: [
        {
          role: 'user',
          type: 'message',
          content: [{ type: 'input_image', image_url: 'data:image/png;base64,aaa' }],
        },
      ],
    };

    patchArkRequestBody(body);

    const image = (body.input?.[0].content as Array<Record<string, unknown>>)[0];
    expect(image.detail).toBeUndefined();
    expect(image.image_pixel_limit).toBeUndefined();
  });
});
