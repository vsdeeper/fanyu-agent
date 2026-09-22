import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// catalog 依赖较重；门控只关心 id 与 requires*，用轻量桩避免拉起生图/联网实现
vi.mock('./catalog/generate-image', () => ({
  generateImage: { id: 'generate_image', create: () => ({}), getHint: () => '' },
}));
vi.mock('./catalog/web-search', () => ({
  webSearch: {
    id: 'web_search',
    requiresNoNativeWebSearch: true,
    create: () => ({}),
    getHint: () => '',
  },
}));
vi.mock('./catalog/save-design-md', () => ({
  saveDesignMd: { id: 'save_design_md', create: () => ({}), getHint: () => '' },
}));
vi.mock('./catalog/analyze-image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./catalog/analyze-image')>();
  return {
    ...actual,
    analyzeImage: {
      id: 'analyze_image',
      requiresConfiguredAnalyzeImageModel: true,
      create: () => ({}),
      getHint: () => actual.analyzeImage.getHint(),
    },
  };
});

import { getConfiguredAnalyzeImageModelId } from './analyze-image-config';
import { listVisibleToolIds } from './registry';

const ORIGINAL = process.env.ANALYZE_IMAGE_MODEL_ID;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.ANALYZE_IMAGE_MODEL_ID;
  } else {
    process.env.ANALYZE_IMAGE_MODEL_ID = ORIGINAL;
  }
});

describe('getConfiguredAnalyzeImageModelId', () => {
  it('空或空白返回 null，有值则 trim', () => {
    delete process.env.ANALYZE_IMAGE_MODEL_ID;
    expect(getConfiguredAnalyzeImageModelId()).toBeNull();

    process.env.ANALYZE_IMAGE_MODEL_ID = '   ';
    expect(getConfiguredAnalyzeImageModelId()).toBeNull();

    process.env.ANALYZE_IMAGE_MODEL_ID = '  doubao-seed-2-0-pro-260215  ';
    expect(getConfiguredAnalyzeImageModelId()).toBe('doubao-seed-2-0-pro-260215');
  });
});

describe('listVisibleToolIds / analyze_image 门控', () => {
  it('未配置时不包含 analyze_image', () => {
    delete process.env.ANALYZE_IMAGE_MODEL_ID;
    expect(listVisibleToolIds({ mainModelAcceptsImage: true })).not.toContain('analyze_image');
  });

  it('已配置时任意主模型能力组合都包含 analyze_image', () => {
    process.env.ANALYZE_IMAGE_MODEL_ID = 'doubao-seed-2-0-pro-260215';
    expect(listVisibleToolIds({ mainModelAcceptsImage: true })).toContain('analyze_image');
    expect(listVisibleToolIds({ mainModelAcceptsImage: false })).toContain('analyze_image');
    expect(
      listVisibleToolIds({ mainModelAcceptsImage: true, providerHasNativeWebSearch: true }),
    ).toContain('analyze_image');
  });
});
