import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildGeneratePlan } from './generate-plan';
import type { StudioGenerateRequest } from '../_shared/generate-types';

const base = { model: 'seedream', aspectRatio: '1:1', quality: 'high', clarity: '2K' };

function img(name: string) {
  return {
    filename: `${name}.png`,
    mediaType: 'image/png',
    dataUrl: `data:image/png;base64,${name}`,
  };
}

const refsOf = (body: StudioGenerateRequest) =>
  buildGeneratePlan(body).map((item) => ({
    index: item.index,
    referenceImageDataUrls: item.referenceImageDataUrls,
  }));

describe('buildGeneratePlan 批次展开', () => {
  it('产品精修按上传原图一对一，忽略表单数量', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'productRefine',
      count: 1,
      refineRequirement: '去背景',
      images: [img('a'), img('b')],
    });

    expect(plan.map((item) => item.index)).toEqual([0, 1]);
    expect(plan.map((item) => item.referenceImageDataUrls)).toEqual([
      [img('a').dataUrl],
      [img('b').dataUrl],
    ]);
    // 同一 prompt 服务一组原图
    expect(plan[0]?.prompt).toBe(plan[1]?.prompt);
  });

  it('产品多视角固定出一张，参考图为选中的精修图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'productMultiview',
      count: 1,
      multiviewRequirement: '多角度',
      refinedImageDataUrls: [img('r').dataUrl],
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.index).toBe(0);
    expect(plan[0]?.referenceImageDataUrls).toEqual([img('r').dataUrl]);
  });

  it('产品多视角出图按数量重复，参考图为产品图', () => {
    expect(refsOf({ ...base, kind: 'productView', count: 2, images: [img('a')] })).toHaveLength(2);
  });

  it('产品模特参考图为产品图 + 模特图', () => {
    expect(
      refsOf({
        ...base,
        kind: 'productModel',
        count: 2,
        viewRequirement: '正面',
        images: [img('a')],
        modelImages: [img('m')],
      }),
    ).toEqual([
      { index: 0, referenceImageDataUrls: [img('a').dataUrl, img('m').dataUrl] },
      { index: 1, referenceImageDataUrls: [img('a').dataUrl, img('m').dataUrl] },
    ]);
  });

  it('营销主视觉按数量重复，参考图为产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'visual',
      count: 3,
      analysisText: '分析',
      productViewImages: [img('a')],
    });

    expect(plan.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(plan.every((item) => item.referenceImageDataUrls.length === 1)).toBe(true);
  });

  it('营销主视觉无产品精修图时出图清单不带参考图，交给文生图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'visual',
      count: 1,
      analysisText: '分析',
      productViewImages: [],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([]);
    expect(plan[0]?.prompt).toContain('本批没有产品精修图参考');
  });

  it('营销主视觉带品牌 Logo 时追加为参考图最末位，无产品图时 Logo 就是第 1 张', () => {
    const withProduct = buildGeneratePlan({
      ...base,
      kind: 'visual',
      count: 1,
      analysisText: '分析',
      productViewImages: [img('a')],
      brandLogoDataUrl: img('logo').dataUrl,
    });
    expect(withProduct[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl, img('logo').dataUrl]);
    expect(withProduct[0]?.prompt).toContain('第2个参考图（即【品牌 Logo】）');

    const logoOnly = buildGeneratePlan({
      ...base,
      kind: 'visual',
      count: 1,
      analysisText: '分析',
      productViewImages: [],
      brandLogoDataUrl: img('logo').dataUrl,
    });
    expect(logoOnly[0]?.referenceImageDataUrls).toEqual([img('logo').dataUrl]);
    expect(logoOnly[0]?.prompt).toContain('第1个参考图（即【品牌 Logo】）');
  });

  it('视觉设计的参考图为产品图 + 主视觉 + 模特图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'design',
      count: 2,
      taskType: '主图',
      includeModel: true,
      analysisText: '分析',
      productViewImages: [img('a')],
      visualDataUrl: img('v').dataUrl,
      modelImages: [img('m')],
    });

    expect(plan).toHaveLength(2);
    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('v').dataUrl,
      img('m').dataUrl,
    ]);
  });

  it('视觉设计带品牌 Logo 时排在主视觉与模特图之间，模特序号随之后移', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'design',
      count: 1,
      taskType: '营销海报',
      includeModel: true,
      analysisText: '分析',
      productViewImages: [img('a')],
      visualDataUrl: img('v').dataUrl,
      brandLogoDataUrl: img('logo').dataUrl,
      modelImages: [img('m')],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('v').dataUrl,
      img('logo').dataUrl,
      img('m').dataUrl,
    ]);
    expect(plan[0]?.prompt).toContain('第2个参考图=已选营销主视觉');
    expect(plan[0]?.prompt).toContain('第3个参考图（即【品牌 Logo】）');
    expect(plan[0]?.prompt).toContain('第4个及之后的参考图=同一位模特的身份与着装参考');
  });

  it('视觉设计未点选视觉标准时参考图不含主视觉，Logo 顺位前移', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'design',
      count: 1,
      taskType: '营销海报',
      includeModel: false,
      analysisText: '分析',
      productViewImages: [img('a')],
      brandLogoDataUrl: img('logo').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl, img('logo').dataUrl]);
    expect(plan[0]?.prompt).not.toContain('=已选营销主视觉');
    expect(plan[0]?.prompt).toContain('第2个参考图（即【品牌 Logo】）');
    expect(plan[0]?.prompt).toContain('本批没有已选营销主视觉参考');
  });

  it('视觉设计无产品精修图时主视觉顺位成为第 1 张', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'design',
      count: 1,
      taskType: '营销海报',
      includeModel: false,
      analysisText: '分析',
      productViewImages: [],
      visualDataUrl: img('v').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('v').dataUrl]);
    expect(plan[0]?.prompt).toContain('第1个参考图=已选营销主视觉');
    expect(plan[0]?.prompt).toContain('本批没有产品精修图参考');
  });

  it('主图按「主题 × 数量」顺序展开，参考图为产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 2,
      requirements: [
        { themeId: 't1', title: '主题一', requirement: '卖点一' },
        { themeId: 't2', title: '主题二', requirement: '卖点二' },
      ],
      productViewImages: [img('a')],
    });

    expect(plan.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(plan.every((item) => item.referenceImageDataUrls.length === 1)).toBe(true);
    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl]);
    expect(plan[0]?.prompt).not.toContain('【文案标准参考图】');
    // 同主题内 prompt 相同，跨主题不同
    expect(plan[0]?.prompt).toBe(plan[1]?.prompt);
    expect(plan[2]?.prompt).toBe(plan[3]?.prompt);
    expect(plan[0]?.prompt).not.toBe(plan[2]?.prompt);
  });

  it('主图带文案标准参考图时追加为参考图末位并点名序号', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a'), img('b')],
      copyStyleReferenceDataUrl: img('r').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('b').dataUrl,
      img('r').dataUrl,
    ]);
    expect(plan[0]?.prompt).toContain('第1至第2个参考图=用户上传的产品精修图');
    expect(plan[0]?.prompt).toContain('第3个参考图（即【文案标准参考图】）');
  });

  it('主图带品牌 Logo 时追加为参考图最末位并点名序号', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a'), img('b')],
      copyStyleReferenceDataUrl: img('r').dataUrl,
      brandLogoDataUrl: img('logo').dataUrl,
    });

    // Logo 排在文案标准参考图之后，故后者序号仍是「产品图张数 + 1」
    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('b').dataUrl,
      img('r').dataUrl,
      img('logo').dataUrl,
    ]);
    expect(plan[0]?.prompt).toContain('第3个参考图（即【文案标准参考图】）');
    expect(plan[0]?.prompt).toContain('第4个参考图（即【品牌 Logo】）');
  });

  it('主图无文案标准参考图但有 Logo 时 Logo 紧随产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a'), img('b')],
      brandLogoDataUrl: img('logo').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('b').dataUrl,
      img('logo').dataUrl,
    ]);
    expect(plan[0]?.prompt).toContain('第3个参考图（即【品牌 Logo】）');
  });

  it('主图无产品精修图时参考图数组只剩末位两张，序号按真实位置重排', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [],
      copyStyleReferenceDataUrl: img('r').dataUrl,
      brandLogoDataUrl: img('logo').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('r').dataUrl, img('logo').dataUrl]);
    expect(plan[0]?.prompt).toContain('第1个参考图（即【文案标准参考图】）');
    expect(plan[0]?.prompt).toContain('第2个参考图（即【品牌 Logo】）');
    expect(plan[0]?.prompt).toContain('本张没有产品精修图参考');
  });

  it('主图参考图全空时出图清单不带参考图，交给文生图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([]);
  });

  it('主图纯视觉无文字时不把文案标准参考图送进参考图数组', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      textlessVisual: true,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
      copyStyleReferenceDataUrl: img('r').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl]);
    expect(plan[0]?.prompt).not.toContain('【文案标准参考图】');
    expect(plan[0]?.prompt).toContain('画面禁止任何可读文字');
  });

  it('主图统一气质时注入视觉气质摘要', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 1,
      unifyVisualMood: true,
      visualMoodSummary: '冷白克制',
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
    });

    expect(plan[0]?.prompt).toContain('【视觉气质摘要】\n冷白克制');
  });

  it('详情图未上传 Logo 时不出现品牌 Logo 段', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
    });

    expect(plan[0]?.prompt).not.toContain('【品牌 Logo】');
  });

  it('详情图带品牌 Logo 时追加为参考图最末位并点名序号', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
      previousScreenDataUrl: img('p').dataUrl,
      brandLogoDataUrl: img('logo').dataUrl,
    });

    // Logo 排在上一屏之后，故上一屏序号仍是「产品图张数 + 1」
    expect(plan[0]?.referenceImageDataUrls).toEqual([
      img('a').dataUrl,
      img('p').dataUrl,
      img('logo').dataUrl,
    ]);
    expect(plan[0]?.prompt).toContain('第2个参考图=上一屏详情图');
    expect(plan[0]?.prompt).toContain('第3个参考图（即【品牌 Logo】）');
  });

  it('详情图无上一屏但有 Logo 时 Logo 紧随产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
      brandLogoDataUrl: img('logo').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl, img('logo').dataUrl]);
    expect(plan[0]?.prompt).toContain('第2个参考图（即【品牌 Logo】）');
  });

  it('详情图按「主题 × 数量」展开，参考图为产品图 + 上一屏', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [
        { themeId: 't1', title: '主题一', requirement: '卖点一' },
        { themeId: 't2', title: '主题二', requirement: '卖点二' },
      ],
      productViewImages: [img('a')],
      previousScreenDataUrl: img('p').dataUrl,
    });

    expect(plan.map((item) => item.index)).toEqual([0, 1]);
    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl, img('p').dataUrl]);
    expect(plan[0]?.prompt).not.toBe(plan[1]?.prompt);
  });

  it('详情图无上一屏时参考图只含产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl]);
  });

  it('详情图无产品精修图时该图只作上一屏参考，序号按真实位置从 1 起', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [],
      previousScreenDataUrl: img('p').dataUrl,
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('p').dataUrl]);
    expect(plan[0]?.prompt).toContain('第1个参考图=上一屏详情图');
  });

  it('详情图参考图全空时出图清单不带参考图，交给文生图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([]);
  });

  it('图文出图固定一张，视觉参考作为参考图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'imageText',
      count: 1,
      prompt: '一杯咖啡放在木桌上',
      styleReferenceDataUrl: img('style').dataUrl,
      characterRequirement: '半身侧影，看向窗外',
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.referenceImageDataUrls).toEqual([img('style').dataUrl]);
    expect(plan[0]?.prompt).toContain('一杯咖啡放在木桌上');
    expect(plan[0]?.prompt).toContain('视觉参考图');
    expect(plan[0]?.prompt).not.toContain('人物模特');
    expect(plan[0]?.prompt).toContain('我的要求');
    expect(plan[0]?.prompt).toContain('半身侧影，看向窗外');
    expect(plan[0]?.prompt).toContain('知识库');
    expect(plan[0]?.prompt).toContain('优先于正文默认的信息密度');
    expect(plan[0]?.prompt).not.toContain('整套视觉约束');
  });

  it('图文无「我的要求」时仍注入取舍精简与留白约束，但不注入知识库 / 要求优先语义', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'imageText',
      count: 1,
      prompt: '# 标题\n\n## 要点\n- 一条',
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.prompt).toContain('【本张画面 / 图文内容】');
    expect(plan[0]?.prompt).toContain('# 标题');
    expect(plan[0]?.prompt).toContain('非必须全文上屏');
    expect(plan[0]?.prompt).toContain('取舍精简');
    expect(plan[0]?.prompt).toContain('安全边距');
    expect(plan[0]?.prompt).not.toContain('我的要求');
    expect(plan[0]?.prompt).not.toContain('知识库');
  });
});
