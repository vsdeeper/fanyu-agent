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

import { getConfiguredAnalyzeImageModelId } from './analyze-image-config';
import { listVisibleToolIds } from './registry';

describe('getConfiguredAnalyzeImageModelId', () => {
  it('专用识图已停用，恒返回 null', () => {
    expect(getConfiguredAnalyzeImageModelId()).toBeNull();
  });
});

describe('listVisibleToolIds', () => {
  it('不包含 analyze_image（本轮未注册）', () => {
    expect(listVisibleToolIds({ mainModelAcceptsImage: true })).not.toContain('analyze_image');
    expect(listVisibleToolIds({ mainModelAcceptsImage: false })).not.toContain('analyze_image');
  });

  it('无原生联网时包含本地 web_search', () => {
    expect(listVisibleToolIds({ providerHasNativeWebSearch: false })).toContain('web_search');
    expect(listVisibleToolIds({ providerHasNativeWebSearch: true })).not.toContain('web_search');
  });
});
