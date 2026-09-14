import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseCreateJobBody } from './parse-job-request';

const BODY = {
  kind: 'mainImage' as const,
  model: 'seedream',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '1K',
  count: 1,
  requirements: [{ themeId: 'product', title: '产品展示', requirement: '特写' }],
  productViewImages: [
    { filename: 'a.png', mediaType: 'image/png', dataUrl: 'data:image/png;base64,a' },
  ],
};

describe('parseCreateJobBody', () => {
  it('保留设计出图开关，避免结算回写时选中态丢失', () => {
    const parsed = parseCreateJobBody({
      stepKey: 'design',
      kind: 'generate',
      pending: {
        stepKey: 'design',
        taskType: '主图',
        slots: [{ id: 'slot-0', aspectRatio: '1:1', status: 'pending' }],
        form: {
          model: 'seedream',
          aspectRatio: '1:1',
          quality: 'high',
          clarity: '1K',
          count: '1',
          taskType: '主图',
          textlessVisual: true,
          unifyVisualMood: false,
        },
      },
      body: BODY,
    });

    expect(parsed?.pending.form).toMatchObject({
      textlessVisual: true,
      unifyVisualMood: false,
    });
  });

  it('旧作业缺出图开关时仍可通过校验', () => {
    const parsed = parseCreateJobBody({
      stepKey: 'design',
      kind: 'generate',
      pending: {
        stepKey: 'design',
        slots: [{ id: 'slot-0', aspectRatio: '1:1', status: 'pending' }],
        form: {
          model: 'seedream',
          aspectRatio: '1:1',
          quality: 'high',
          clarity: '1K',
          count: '1',
        },
      },
      body: BODY,
    });

    expect(parsed?.pending.form).not.toHaveProperty('textlessVisual');
    expect(parsed?.pending.form).not.toHaveProperty('unifyVisualMood');
  });
});
