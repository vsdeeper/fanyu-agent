import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildAnalyzePrompt } from './analyze-prompt';

describe('buildAnalyzePrompt', () => {
  it('主图：商业分析 + 产品资料两段', () => {
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文', '产品资料正文');
    expect(prompt).toContain('【主图分析】');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).toContain('- 产品资料：产品资料正文');
  });

  it('无产品资料时不追加产品资料段', () => {
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('产品资料提取为空时不追加产品资料段', () => {
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文', '');
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('详情图保持原有两段', () => {
    const prompt = buildAnalyzePrompt('detailImage', '商业分析正文');
    expect(prompt).toContain('【详情图结构规划】');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('详情图带产品资料时追加产品资料段', () => {
    const prompt = buildAnalyzePrompt('detailImage', '商业分析正文', '产品资料正文');
    expect(prompt).toContain('【详情图结构规划】');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).toContain('- 产品资料：产品资料正文');
  });
});
