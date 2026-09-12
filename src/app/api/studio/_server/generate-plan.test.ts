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

  it('主图按「主题 × 数量」顺序展开，参考图为产品图', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'mainImage',
      count: 2,
      analysisText: '分析',
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
      analysisText: '分析',
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
      analysisText: '分析',
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
      analysisText: '分析',
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
      analysisText: '分析',
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
      analysisText: '分析',
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([]);
  });

  it('详情图不出现品牌 Logo 段', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      analysisText: '分析',
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
    });

    expect(plan[0]?.prompt).not.toContain('【品牌 Logo】');
  });

  it('详情图按「主题 × 数量」展开，参考图为产品图 + 上一屏', () => {
    const plan = buildGeneratePlan({
      ...base,
      kind: 'detailImage',
      count: 1,
      analysisText: '分析',
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
      analysisText: '分析',
      requirements: [{ themeId: 't1', title: '主题一', requirement: '卖点一' }],
      productViewImages: [img('a')],
    });

    expect(plan[0]?.referenceImageDataUrls).toEqual([img('a').dataUrl]);
  });
});
