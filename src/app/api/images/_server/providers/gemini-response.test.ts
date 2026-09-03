import { describe, expect, it } from 'vitest';
import { extractGeminiImage } from './gemini-response';

const FIRST_IMAGE = Buffer.from('first-image').toString('base64');
const FINAL_IMAGE = Buffer.from('final-image').toString('base64');

describe('extractGeminiImage', () => {
  it('多图片段时选择最后一个图片 part', () => {
    const image = extractGeminiImage({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: FIRST_IMAGE } },
              { text: 'done' },
              { inlineData: { mimeType: 'image/jpeg', data: FINAL_IMAGE } },
            ],
          },
        },
      ],
    });

    expect(image?.mimeType).toBe('image/jpeg');
    expect(Buffer.from(image?.bytes ?? []).toString()).toBe('final-image');
  });

  it('兼容 snake_case 的 inline_data 响应', () => {
    const image = extractGeminiImage({
      candidates: [
        {
          content: {
            parts: [{ inline_data: { mime_type: 'image/webp', data: FINAL_IMAGE } }],
          },
        },
      ],
    });

    expect(image?.mimeType).toBe('image/webp');
    expect(Buffer.from(image?.bytes ?? []).toString()).toBe('final-image');
  });
});
