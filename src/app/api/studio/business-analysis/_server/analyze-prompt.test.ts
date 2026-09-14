import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildAnalyzePrompt } from './analyze-prompt';

describe('buildAnalyzePrompt', () => {
  it('四段素材齐全时按顺序各出现一次', () => {
    const prompt = buildAnalyzePrompt({
      productDescription: '主打轻量便携',
      documentsText: '产品资料正文',
      hasBrandLogo: true,
      hasProductImages: true,
    });
    expect(prompt).toContain('【工作台商业分析】');
    expect(prompt).toContain('- 产品说明：主打轻量便携');
    expect(prompt).toContain('- 产品资料：产品资料正文');
    expect(prompt).toContain('- 品牌 Logo：用户已提供品牌 Logo 图（见本消息附件）');
    expect(prompt).toContain('- 产品精修图：见本消息附件');
    expect(prompt).not.toContain('- 未提供产品精修图');
    expect(prompt.indexOf('- 产品说明：')).toBeLessThan(prompt.indexOf('- 产品资料：'));
  });

  it('无产品图时交代事实来源，而不是留空', () => {
    const prompt = buildAnalyzePrompt({ productDescription: '主打轻量便携' });
    expect(prompt).toContain('- 未提供产品精修图');
    expect(prompt).not.toContain('- 产品精修图：见本消息附件');
  });

  it('无资料时不出现空的「- 产品资料：」行', () => {
    const prompt = buildAnalyzePrompt({ documentsText: '', hasProductImages: true });
    expect(prompt).not.toContain('- 产品资料：');
  });

  it('无产品说明时不出现空行', () => {
    const prompt = buildAnalyzePrompt({ productDescription: '   ', hasProductImages: true });
    expect(prompt).not.toContain('- 产品说明：');
  });

  it('未提供品牌 Logo 时不追加 Logo 段', () => {
    const withoutLogo = buildAnalyzePrompt({ hasProductImages: true });
    expect(withoutLogo).not.toContain('- 品牌 Logo：');
  });

  it('Logo 段不出现出图 / 主题卡语言', () => {
    // 商业分析指令禁止出图与清单语言，故不能照抄电商那两行
    const prompt = buildAnalyzePrompt({ hasBrandLogo: true, hasProductImages: true });
    expect(prompt).not.toContain('主题卡');
    expect(prompt).not.toContain('出图时会直接以它呈现');
  });
});
