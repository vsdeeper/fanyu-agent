import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildAnalyzePrompt } from './analyze-prompt';

describe('buildAnalyzePrompt', () => {
  it('主图：商业分析 + 产品资料两段', () => {
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文', {
      productDocsText: '产品资料正文',
    });
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
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文', { productDocsText: '' });
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('主图带品牌 Logo 识图结果时追加 Logo 告知行与识图段', () => {
    const prompt = buildAnalyzePrompt('mainImage', '商业分析正文', {
      brandLogoText: '圆形徽标，主色墨绿。',
    });
    expect(prompt).toContain('- 品牌 Logo：用户已提供品牌 Logo 图');
    expect(prompt).toContain('- 品牌 Logo 识图结果：\n圆形徽标，主色墨绿。');
    // 识图段排在产品资料之后，是最后一段资料
    expect(prompt.indexOf('- 品牌 Logo 识图结果：')).toBeGreaterThan(
      prompt.indexOf('- 商业分析：'),
    );
  });

  it('未上传品牌 Logo（或识图失败）时不追加 Logo 段', () => {
    const withoutLogo = buildAnalyzePrompt('mainImage', '商业分析正文');
    expect(withoutLogo).not.toContain('- 品牌 Logo：');
    expect(withoutLogo).not.toContain('- 品牌 Logo 识图结果：');

    // 识图失败时上层传 undefined；空白串等同无内容
    const blankLogo = buildAnalyzePrompt('mainImage', '商业分析正文', { brandLogoText: '   ' });
    expect(blankLogo).not.toContain('- 品牌 Logo：');
  });

  it('详情图保持原有两段', () => {
    const prompt = buildAnalyzePrompt('detailImage', '商业分析正文');
    expect(prompt).toContain('【详情图结构规划】');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('详情图带产品资料时追加产品资料段', () => {
    const prompt = buildAnalyzePrompt('detailImage', '商业分析正文', {
      productDocsText: '产品资料正文',
    });
    expect(prompt).toContain('【详情图结构规划】');
    expect(prompt).toContain('- 商业分析：商业分析正文');
    expect(prompt).toContain('- 产品资料：产品资料正文');
  });
});
