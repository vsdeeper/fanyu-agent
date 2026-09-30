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

const SETTINGS = {
  providerConfigs: [
    { provider: 'deepseek' as const, apiKey: 'k', baseUrl: 'https://example.test' },
    { provider: 'laozhang' as const, apiKey: 'k', baseUrl: 'https://example.test' },
  ],
  chatProvider: 'deepseek' as const,
  chatModels: { modelPro: 'm', modelLite: 'm', modelMini: 'm' },
  generateImage: {
    provider: 'laozhang' as const,
    modelId: 'gpt-image-2.5-flare-vip',
    quality: 'xhigh',
  },
  editImage: {
    provider: 'laozhang' as const,
    modelId: 'gpt-image-2.5-sunburst-vip',
    quality: 'xhigh',
  },
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
      settings: SETTINGS,
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
      settings: SETTINGS,
    });

    expect(parsed?.pending.form).not.toHaveProperty('textlessVisual');
    expect(parsed?.pending.form).not.toHaveProperty('unifyVisualMood');
  });

  it('缺少 settings 时返回 null', () => {
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

    expect(parsed).toBeNull();
  });
});
