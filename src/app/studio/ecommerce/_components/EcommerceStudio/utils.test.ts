import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DESIGN_FORM_STATE, DEFAULT_FORM_STATE } from './constants';
import {
  groupResultImagesByRatio,
  groupResultImagesByTheme,
  isNextDisabled,
  isPrevVisible,
  toEmptyHint,
  toResultHeadTitle,
} from './ResultPanel/utils';
import type { ProductDocItem, ProductImageItem, StudioResultImage } from './types';
import {
  appendPendingDesignImages,
  appendPendingMainImageImages,
  appendPendingThemeImages,
  appendProductDocs,
  appendProductImages,
  applyDesignGenerateEvent,
  applyGenerateEvent,
  canStartThemePlan,
  createAnalysisStepSnapshot,
  createDefaultDesignForm,
  createDesignStepSnapshot,
  getGeneratedDesignGroups,
  isSameStepSnapshot,
  pendingImagesFromCount,
  phaseAfterNext,
  phaseAfterPrev,
  readAnalysisStepSnapshot,
  readBrandLogoDataUrl,
  readDesignStepSnapshot,
  readVisualStepSnapshot,
  resolveInitialStudioPhase,
  toDesignGeneratePayload,
  toDetailImageGeneratePayload,
  toMainImageGeneratePayload,
  toThemeAnalyzePayload,
  toVisualGeneratePayload,
} from './utils';

/** 生成一个可序列化的产品图（无 file，previewUrl 为 data URL，直接被 readUrlAsDataUrl 原样返回）。 */
const IMAGE_ITEM = (uid: string, name: string): ProductImageItem => ({
  uid,
  previewUrl: 'data:image/png;base64,product',
  name,
  mimeType: 'image/png',
  size: 0,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('上传项 uid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('新项使用 UUID 且不含文件名', () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => undefined,
    });
    const imageFile = new File(['img'], '美的台扇.png', { type: 'image/png' });
    const docFile = new File(['doc'], '美的台扇FGAU40D说明书.md', { type: 'text/markdown' });

    const images = appendProductImages([], [imageFile]);
    const documents = appendProductDocs([], [docFile]);

    expect(images[0]?.uid).toMatch(UUID_RE);
    expect(images[0]?.uid).not.toContain(imageFile.name);
    expect(images[0]?.name).toBe(imageFile.name);
    expect(documents[0]?.uid).toMatch(UUID_RE);
    expect(documents[0]?.uid).not.toContain(docFile.name);
    expect(documents[0]?.name).toBe(docFile.name);
  });
});

describe('pendingImagesFromCount', () => {
  it('每批槽位各自生成唯一 id 并保留各自尺寸比例', () => {
    const firstBatch = pendingImagesFromCount(2, '1:1');
    const secondBatch = pendingImagesFromCount(2, '16:9');

    expect([...firstBatch, ...secondBatch].map((slot) => slot.aspectRatio)).toEqual([
      '1:1',
      '1:1',
      '16:9',
      '16:9',
    ]);
    const ids = [...firstBatch, ...secondBatch].map((slot) => slot.id);
    expect(new Set(ids).size).toBe(4);
  });
});

describe('applyGenerateEvent', () => {
  it('只更新事件指向的槽位，其余原样保留', () => {
    const current: StudioResultImage[] = [
      { id: 'old', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,old' },
      { id: 'failed', aspectRatio: '1:1', status: 'failed', error: '旧批次失败' },
      ...pendingImagesFromCount(2, '16:9').map((slot, offset) => ({
        ...slot,
        id: `new-${offset}`,
      })),
    ];

    const next = applyGenerateEvent(current, {
      slotId: 'new-0',
      url: 'data:image/png;base64,new',
    });

    expect(next).toEqual([
      current[0],
      current[1],
      { id: 'new-0', aspectRatio: '16:9', status: 'ready', url: 'data:image/png;base64,new' },
      current[3],
    ]);
  });

  it('事件指向别的槽位时不改写既有状态', () => {
    const current: StudioResultImage[] = [
      { id: 'old', aspectRatio: '4:3', status: 'ready', url: 'data:image/png;base64,old' },
      { id: 'new', aspectRatio: '3:4', status: 'pending' },
    ];

    const next = applyGenerateEvent(current, { slotId: 'new', error: '生成失败' });

    expect(next[0]).toBe(current[0]);
    expect(next[1]).toEqual({
      id: 'new',
      aspectRatio: '3:4',
      status: 'failed',
      error: '生成失败',
    });
  });
});

describe('设计表单默认值', () => {
  it('主图与详情图默认 1K，营销海报默认 2K', () => {
    expect(createDefaultDesignForm('主图').clarity).toBe('1K');
    expect(createDefaultDesignForm('详情图')).toMatchObject({
      clarity: '1K',
      aspectRatio: '3:4',
    });
    expect(createDefaultDesignForm('营销海报').clarity).toBe('2K');
  });
});

describe('视觉设计请求体', () => {
  it('固定传分析、全部产品图与已选主视觉', async () => {
    const payload = await toDesignGeneratePayload(
      DEFAULT_DESIGN_FORM_STATE,
      ' 商业分析 ',
      [IMAGE_ITEM('p-1', 'product.png')],
      'data:image/png;base64,visual',
    );

    expect(payload).toMatchObject({
      kind: 'design',
      taskType: '主图',
      includeModel: false,
      analysisText: '商业分析',
      visualDataUrl: 'data:image/png;base64,visual',
    });
    expect(payload).toMatchObject({
      productViewImages: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,product',
        },
      ],
    });
    expect(payload).not.toHaveProperty('modelImages');
  });

  it('主图请求体含商业分析与主题列表，不含主视觉、模特与套图视觉规范', async () => {
    const payload = await toMainImageGeneratePayload(
      DEFAULT_DESIGN_FORM_STATE,
      ' 目标人群偏好冷白 ',
      [{ themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' }],
      [IMAGE_ITEM('p-1', 'product.png')],
    );

    expect(payload).toMatchObject({
      kind: 'mainImage',
      analysisText: '目标人群偏好冷白',
      requirements: [{ themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' }],
    });
    expect(payload).not.toHaveProperty('visualDataUrl');
    expect(payload).not.toHaveProperty('modelImages');
    expect(payload).not.toHaveProperty('taskType');
    expect(payload).not.toHaveProperty('visualLock');
    expect(payload).not.toHaveProperty('copyStyleReferenceDataUrl');
    expect(payload).not.toHaveProperty('brandLogoDataUrl');
    expect(payload).not.toHaveProperty('mainImageDescription');
  });

  it('主图请求体四个可选值各归其位，空值一律不携带', async () => {
    const requirements = [{ themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' }];
    const images = [IMAGE_ITEM('p-1', 'product.png')];

    const withAll = await toMainImageGeneratePayload(
      DEFAULT_DESIGN_FORM_STATE,
      '目标人群偏好冷白',
      requirements,
      images,
      {
        productDocumentsText: ' 容量 500ml ',
        mainImageDescription: ' 底色走冷白 ',
        copyStyleReferenceDataUrl: 'data:image/png;base64,ref',
        brandLogoDataUrl: 'data:image/png;base64,logo',
      },
    );
    expect(withAll).toMatchObject({
      productDocumentsText: '容量 500ml',
      mainImageDescription: '底色走冷白',
      copyStyleReferenceDataUrl: 'data:image/png;base64,ref',
      brandLogoDataUrl: 'data:image/png;base64,logo',
    });

    const withNone = await toMainImageGeneratePayload(
      DEFAULT_DESIGN_FORM_STATE,
      '目标人群偏好冷白',
      requirements,
      images,
    );
    expect(withNone).not.toHaveProperty('copyStyleReferenceDataUrl');
    expect(withNone).not.toHaveProperty('brandLogoDataUrl');
    expect(withNone).not.toHaveProperty('productDocumentsText');
    expect(withNone).not.toHaveProperty('mainImageDescription');

    const withBlank = await toMainImageGeneratePayload(
      DEFAULT_DESIGN_FORM_STATE,
      '目标人群偏好冷白',
      requirements,
      images,
      { productDocumentsText: '  ', mainImageDescription: '  ' },
    );
    expect(withBlank).not.toHaveProperty('productDocumentsText');
    expect(withBlank).not.toHaveProperty('mainImageDescription');
  });

  it('详情图请求体含当前屏主题卡，可选上一屏参考图', async () => {
    const payload = await toDetailImageGeneratePayload(
      { ...DEFAULT_DESIGN_FORM_STATE, taskType: '详情图', aspectRatio: '3:4' },
      ' 气质冷白 ',
      [{ themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' }],
      [IMAGE_ITEM('p-1', 'product.png')],
      'data:image/png;base64,previous',
    );

    expect(payload).toMatchObject({
      kind: 'detailImage',
      analysisText: '气质冷白',
      aspectRatio: '3:4',
      requirements: [{ themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' }],
      previousScreenDataUrl: 'data:image/png;base64,previous',
    });
    expect(payload).not.toHaveProperty('visualDataUrl');
    expect(payload).not.toHaveProperty('taskType');
  });

  it('详情图请求体带产品资料正文，无资料或空白串不携带', async () => {
    const form = { ...DEFAULT_DESIGN_FORM_STATE, taskType: '详情图' as const, aspectRatio: '3:4' };
    const requirements = [{ themeId: 'brand', title: '品牌认知', requirement: '建立品牌第一印象' }];
    const productImages = [IMAGE_ITEM('p-1', 'product.png')];

    const withoutProductDocs = await toDetailImageGeneratePayload(
      form,
      '气质冷白',
      requirements,
      productImages,
    );
    expect(withoutProductDocs).not.toHaveProperty('productDocumentsText');

    const blankProductDocs = await toDetailImageGeneratePayload(
      form,
      '气质冷白',
      requirements,
      productImages,
      undefined,
      '   ',
    );
    expect(blankProductDocs).not.toHaveProperty('productDocumentsText');

    const withProductDocs = await toDetailImageGeneratePayload(
      form,
      '气质冷白',
      requirements,
      productImages,
      undefined,
      ' 容量 500ml ',
    );
    expect(withProductDocs).toMatchObject({ productDocumentsText: '容量 500ml' });
  });

  it('营销海报同样带入主视觉，并可附带可选模特形象', async () => {
    const payload = await toDesignGeneratePayload(
      { ...DEFAULT_DESIGN_FORM_STATE, taskType: '营销海报' },
      '商业分析',
      [IMAGE_ITEM('p-1', 'product.png')],
      'data:image/png;base64,visual',
      [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,model',
        },
      ],
    );

    expect(payload).toMatchObject({
      kind: 'design',
      taskType: '营销海报',
      includeModel: true,
      visualDataUrl: 'data:image/png;base64,visual',
    });
    expect(payload).toHaveProperty('modelImages');
  });
});

describe('营销主视觉请求体', () => {
  it('固定传分析与全部产品图', async () => {
    const payload = await toVisualGeneratePayload(DEFAULT_FORM_STATE, ' 商业分析 ', [
      IMAGE_ITEM('p-1', 'a.png'),
      IMAGE_ITEM('p-2', 'b.png'),
    ]);

    expect(payload).toMatchObject({
      kind: 'visual',
      model: DEFAULT_FORM_STATE.model,
      analysisText: '商业分析',
      productViewImages: [
        { filename: 'a.png', mediaType: 'image/png', dataUrl: 'data:image/png;base64,product' },
        { filename: 'b.png', mediaType: 'image/png', dataUrl: 'data:image/png;base64,product' },
      ],
    });
  });
});

describe('按比例二级分组', () => {
  it('按出现顺序稳定拆组', () => {
    const images: StudioResultImage[] = [
      { id: 'a', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,a' },
      { id: 'b', aspectRatio: '3:4', status: 'ready', url: 'data:image/png;base64,b' },
      { id: 'c', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,c' },
    ];

    expect(groupResultImagesByRatio(images)).toEqual([
      { aspectRatio: '1:1', images: [images[0], images[2]] },
      { aspectRatio: '3:4', images: [images[1]] },
    ]);
  });
});

describe('视觉设计结果分组', () => {
  it('同类型连续生成追加，切换类型后互不覆盖', () => {
    const first = appendPendingDesignImages({}, '主图', 1, '1:1');
    const ready = applyDesignGenerateEvent(first.groups, '主图', {
      slotId: first.slots[0]!.id,
      url: 'data:image/png;base64,main',
    });
    const second = appendPendingDesignImages(ready, '主图', 1, '16:9');
    const poster = appendPendingDesignImages(second.groups, '营销海报', 1, '3:4');

    expect(poster.groups['主图']).toHaveLength(2);
    expect(poster.groups['主图']?.[0]?.status).toBe('ready');
    expect(poster.groups['主图']?.[1]).toMatchObject({
      id: second.slots[0]!.id,
      aspectRatio: '16:9',
    });
    expect(poster.groups['营销海报']).toEqual([
      { id: poster.slots[0]!.id, aspectRatio: '3:4', status: 'pending' },
    ]);
  });

  it('主图 pending 按主题×数量展开并带 themeId', () => {
    const { groups, slots } = appendPendingMainImageImages(
      {},
      [
        { themeId: 'product', title: '产品展示' },
        { themeId: 'scene', title: '使用场景' },
      ],
      2,
      '1:1',
    );
    expect(slots).toHaveLength(4);
    expect(groups['主图']).toEqual([
      {
        id: slots[0]!.id,
        aspectRatio: '1:1',
        status: 'pending',
        themeId: 'product',
        themeTitle: '产品展示',
      },
      {
        id: slots[1]!.id,
        aspectRatio: '1:1',
        status: 'pending',
        themeId: 'product',
        themeTitle: '产品展示',
      },
      {
        id: slots[2]!.id,
        aspectRatio: '1:1',
        status: 'pending',
        themeId: 'scene',
        themeTitle: '使用场景',
      },
      {
        id: slots[3]!.id,
        aspectRatio: '1:1',
        status: 'pending',
        themeId: 'scene',
        themeTitle: '使用场景',
      },
    ]);
  });

  it('详情图 pending 写入详情图分组', () => {
    const { groups, slots } = appendPendingThemeImages(
      {},
      '详情图',
      [{ themeId: 'brand', title: '品牌认知' }],
      1,
      '3:4',
    );
    expect(groups['详情图']).toEqual([
      {
        id: slots[0]!.id,
        aspectRatio: '3:4',
        status: 'pending',
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
    ]);
  });

  it('中止时只保留生成成功的图，丢掉 pending 与失败', () => {
    const groups = getGeneratedDesignGroups({
      主图: [
        { id: 'a', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,ok' },
        { id: 'b', aspectRatio: '1:1', status: 'pending' },
        { id: 'c', aspectRatio: '1:1', status: 'failed', error: '失败' },
      ],
      营销海报: [{ id: 'd', aspectRatio: '3:4', status: 'pending' }],
    });
    expect(groups).toEqual({
      主图: [{ id: 'a', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,ok' }],
    });
  });
});

describe('按主题一级分组', () => {
  it('按固定主题顺序分组，组内再按比例', () => {
    const images: StudioResultImage[] = [
      {
        id: 'img-0',
        aspectRatio: '1:1',
        status: 'ready',
        themeId: 'scene',
        themeTitle: '使用场景',
        url: 'a',
      },
      {
        id: 'img-1',
        aspectRatio: '1:1',
        status: 'ready',
        themeId: 'product',
        themeTitle: '产品展示',
        url: 'b',
      },
      {
        id: 'img-2',
        aspectRatio: '16:9',
        status: 'ready',
        themeId: 'product',
        themeTitle: '产品展示',
        url: 'c',
      },
    ];
    const grouped = groupResultImagesByTheme(images, [
      { id: 'product', title: '产品展示' },
      { id: 'scene', title: '使用场景' },
    ]);
    expect(grouped.map((group) => group.themeId)).toEqual(['product', 'scene']);
    expect(groupResultImagesByRatio(grouped[0]!.images).map((item) => item.aspectRatio)).toEqual([
      '1:1',
      '16:9',
    ]);
  });
});

describe('canStartThemePlan', () => {
  it('主图：商业分析与主图说明至少一项非空才可开始', () => {
    expect(
      canStartThemePlan({ taskType: '主图', documentCount: 1, mainImageDescription: '' }),
    ).toBe(true);
    expect(
      canStartThemePlan({ taskType: '主图', documentCount: 0, mainImageDescription: '底色走冷白' }),
    ).toBe(true);
    expect(
      canStartThemePlan({ taskType: '主图', documentCount: 0, mainImageDescription: '   ' }),
    ).toBe(false);
    expect(
      canStartThemePlan({ taskType: '主图', documentCount: 0, mainImageDescription: '' }),
    ).toBe(false);
  });

  it('详情图仍必须有商业分析，主图说明不能替代', () => {
    expect(
      canStartThemePlan({ taskType: '详情图', documentCount: 1, mainImageDescription: '' }),
    ).toBe(true);
    expect(
      canStartThemePlan({
        taskType: '详情图',
        documentCount: 0,
        mainImageDescription: '底色走冷白',
      }),
    ).toBe(false);
  });

  it('营销海报不受本判据约束', () => {
    expect(
      canStartThemePlan({
        taskType: '营销海报',
        documentCount: 0,
        mainImageDescription: '底色走冷白',
      }),
    ).toBe(false);
  });
});

describe('readBrandLogoDataUrl', () => {
  it('取首张 Logo 的 data URL，未上传返回 undefined', async () => {
    expect(await readBrandLogoDataUrl([IMAGE_ITEM('logo-1', 'logo.png')])).toBe(
      'data:image/png;base64,product',
    );
    expect(await readBrandLogoDataUrl([])).toBeUndefined();
  });
});

describe('步骤快照水合', () => {
  it('恢复分析、主视觉与视觉设计历史数据', () => {
    const analysis = readAnalysisStepSnapshot({
      images: [
        { uid: 'img-1', previewUrl: '/api/studio/ecommerce/tasks/t1/assets/a1', name: 'p.png' },
      ],
      documents: [
        { uid: 'doc-1', previewUrl: '/api/studio/ecommerce/tasks/t1/assets/a2', name: 's.md' },
      ],
      analysisText: '商业分析正文',
    });
    const visual = readVisualStepSnapshot({
      form: {
        model: 'gpt-image-2-vip',
        aspectRatio: '1:1',
        quality: 'high',
        clarity: '2K',
        count: '2',
      },
      visualImages: [
        {
          id: 'v-1',
          aspectRatio: '1:1',
          status: 'ready',
          url: '/api/studio/ecommerce/tasks/t1/assets/v1',
        },
      ],
      selectedVisualId: 'v-1',
    });
    const design = readDesignStepSnapshot({
      form: DEFAULT_DESIGN_FORM_STATE,
      designResultGroups: {
        主图: [{ id: 'm-1', aspectRatio: '1:1', status: 'ready', url: '/api/a' }],
      },
    });

    expect(analysis?.analysisText).toBe('商业分析正文');
    expect(analysis?.images[0]?.file).toBeUndefined();
    expect(visual?.selectedVisualId).toBe('v-1');
    expect(visual?.images).toBeUndefined();
    expect(visual?.analysisText).toBeUndefined();
    expect(design?.designResultGroups['主图']).toHaveLength(1);
    expect(design?.modelImages).toEqual([]);
    expect(readAnalysisStepSnapshot({ images: [] })).toBeUndefined();
  });

  it('分析快照水合产品资料：有则透传，无则为 undefined', () => {
    const withProductDocs = readAnalysisStepSnapshot({
      images: [],
      documents: [{ uid: 'doc-1', previewUrl: '/api/a2', name: 's.md' }],
      productDocs: [{ uid: 'pdoc-1', previewUrl: '/api/a3', name: '说明书.md' }],
      analysisText: '',
    });
    expect(withProductDocs?.productDocs).toEqual([
      { uid: 'pdoc-1', previewUrl: '/api/a3', name: '说明书.md' },
    ]);

    const withoutProductDocs = readAnalysisStepSnapshot({
      images: [],
      documents: [],
      analysisText: '',
    });
    expect(withoutProductDocs?.productDocs).toBeUndefined();
  });

  it('分析快照水合品牌 Logo 与主图说明：有则透传，无或空白则为 undefined', () => {
    const withBoth = readAnalysisStepSnapshot({
      images: [],
      documents: [],
      analysisText: '',
      brandLogoImages: [{ uid: 'logo-1', previewUrl: '/api/a4', name: 'logo.png' }],
      mainImageDescription: '底色走冷白',
    });
    expect(withBoth?.brandLogoImages).toEqual([
      { uid: 'logo-1', previewUrl: '/api/a4', name: 'logo.png' },
    ]);
    expect(withBoth?.mainImageDescription).toBe('底色走冷白');

    const blank = readAnalysisStepSnapshot({
      images: [],
      documents: [],
      analysisText: '',
      brandLogoImages: [],
      mainImageDescription: '',
    });
    expect(blank?.brandLogoImages).toBeUndefined();
    expect(blank?.mainImageDescription).toBeUndefined();
    // 与设计快照上历史遗留的 form.requirement 划界：新字段挂在 analysis 快照顶层
    expect(blank?.mainImageDescription).not.toBe('');
  });

  it('品牌 Logo 与主图说明快照往返后判等，空值不写键', async () => {
    const logo = IMAGE_ITEM('logo-1', 'logo.png');
    const withBoth = await createAnalysisStepSnapshot([], [], '', {
      brandLogoImages: [logo],
      mainImageDescription: ' 底色走冷白 ',
    });
    expect(withBoth.brandLogoImages).toHaveLength(1);
    expect(withBoth.brandLogoImages?.[0]?.file).toBeUndefined();
    expect(withBoth.mainImageDescription).toBe('底色走冷白');

    const hydrated = readAnalysisStepSnapshot(JSON.parse(JSON.stringify(withBoth)));
    expect(isSameStepSnapshot(hydrated, withBoth)).toBe(true);

    // 空数组 / 全空白一律不写键，否则首次进入点「下一步」会白打一次保存
    const blank = await createAnalysisStepSnapshot([], [], '', {
      brandLogoImages: [],
      mainImageDescription: '   ',
    });
    expect(blank).not.toHaveProperty('brandLogoImages');
    expect(blank).not.toHaveProperty('mainImageDescription');
    expect(
      isSameStepSnapshot(blank, readAnalysisStepSnapshot(JSON.parse(JSON.stringify(blank)))),
    ).toBe(true);
  });

  it('toThemeAnalyzePayload：可选资料仅在非空时携带', async () => {
    const DOC_ITEM = (uid: string, name: string): ProductDocItem => ({
      uid,
      previewUrl: 'data:text/plain;base64,5YWl5Y+y',
      name,
      mimeType: 'text/plain',
      size: 0,
    });

    const withoutProductDocs = await toThemeAnalyzePayload(
      [DOC_ITEM('a', '商业分析.md')],
      'mainImage',
    );
    expect(withoutProductDocs.kind).toBe('mainImage');
    expect(withoutProductDocs.documents).toHaveLength(1);
    expect(withoutProductDocs.productDocuments).toBeUndefined();
    expect(withoutProductDocs.mainImageDescription).toBeUndefined();
    expect(withoutProductDocs.brandLogoDataUrl).toBeUndefined();

    const emptyProductDocs = await toThemeAnalyzePayload(
      [DOC_ITEM('a', '商业分析.md')],
      'detailImage',
      { productDocs: [] },
    );
    expect(emptyProductDocs.kind).toBe('detailImage');
    expect(emptyProductDocs.productDocuments).toBeUndefined();

    const withProductDocs = await toThemeAnalyzePayload(
      [DOC_ITEM('a', '商业分析.md')],
      'mainImage',
      { productDocs: [DOC_ITEM('b', '产品资料.txt')] },
    );
    expect(withProductDocs.productDocuments).toEqual([
      {
        filename: '产品资料.txt',
        mediaType: 'text/plain',
        dataUrl: 'data:text/plain;base64,5YWl5Y+y',
      },
    ]);
  });

  it('toThemeAnalyzePayload：主图可无商业分析，主图说明与 Logo 原图按需携带', async () => {
    const withDescription = await toThemeAnalyzePayload([], 'mainImage', {
      mainImageDescription: ' 底色走冷白 ',
      brandLogo: [IMAGE_ITEM('logo-1', 'logo.png')],
    });
    expect(withDescription.documents).toEqual([]);
    expect(withDescription.mainImageDescription).toBe('底色走冷白');
    // Logo 传的是原图 data URL（服务端先识图再进分析），不是布尔值
    expect(withDescription.brandLogoDataUrl).toBe('data:image/png;base64,product');

    const blankRequirement = await toThemeAnalyzePayload([], 'mainImage', {
      mainImageDescription: '   ',
      brandLogo: [],
    });
    expect(blankRequirement.mainImageDescription).toBeUndefined();
    expect(blankRequirement.brandLogoDataUrl).toBeUndefined();
  });

  it('历史 designType 与 referenceVisual 读入时丢弃旧字段', () => {
    const { taskType, ...formWithoutTaskType } = DEFAULT_DESIGN_FORM_STATE;
    expect(taskType).toBe('主图');
    const design = readDesignStepSnapshot({
      form: { ...formWithoutTaskType, designType: '主图', referenceVisual: false },
      designResultGroups: {},
    });
    expect(design?.form.taskType).toBe('主图');
    expect(design?.form).not.toHaveProperty('designType');
    expect(design?.form).not.toHaveProperty('referenceVisual');
  });

  it('海报主视觉快照读取精修图、分析文件与正文', () => {
    const visual = readVisualStepSnapshot({
      form: DEFAULT_FORM_STATE,
      visualImages: [
        {
          id: 'img-0',
          aspectRatio: '1:1',
          status: 'ready',
          url: '/api/studio/ecommerce/tasks/t1/assets/v1',
        },
      ],
      selectedVisualId: 'img-0',
      images: [
        { uid: 'img-1', previewUrl: '/api/studio/ecommerce/tasks/t1/assets/p1', name: 'p.png' },
      ],
      documents: [
        { uid: 'doc-1', previewUrl: '/api/studio/ecommerce/tasks/t1/assets/a1', name: '分析.md' },
      ],
      analysisText: '上传的商业分析正文',
    });
    expect(visual?.images).toHaveLength(1);
    expect(visual?.documents?.[0]?.name).toBe('分析.md');
    expect(visual?.analysisText).toBe('上传的商业分析正文');
  });

  it('主图设计快照读取精修图', () => {
    const design = readDesignStepSnapshot({
      form: DEFAULT_DESIGN_FORM_STATE,
      designResultGroups: {
        主图: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }],
      },
      images: [
        { uid: 'img-1', previewUrl: '/api/studio/ecommerce/tasks/t1/assets/p1', name: 'p.png' },
      ],
    });
    expect(design?.images).toHaveLength(1);
    expect(design?.form).not.toHaveProperty('requirement');
  });

  it('详情图设计快照读取上一屏与导出点选', () => {
    const design = readDesignStepSnapshot({
      form: { ...DEFAULT_DESIGN_FORM_STATE, taskType: '详情图' },
      designResultGroups: {
        详情图: [
          { id: 'd-1', aspectRatio: '3:4', status: 'ready', url: '/api/img/1' },
          { id: 'd-2', aspectRatio: '3:4', status: 'ready', url: '/api/img/2' },
        ],
      },
      referenceImageId: 'd-2',
      selectedExportIds: ['d-1', 'ghost'],
    });
    expect(design?.referenceImageId).toBe('d-2');
    // 既不在结果集里的死 id 被过滤掉
    expect(design?.selectedExportIds).toEqual(['d-1']);
  });

  it('旧快照的数字下标读不出 id：图片仍保留，选中态按未选中处理', () => {
    const design = readDesignStepSnapshot({
      form: { ...DEFAULT_DESIGN_FORM_STATE, taskType: '详情图' },
      designResultGroups: {
        详情图: [{ index: 3, aspectRatio: '3:4', status: 'ready', url: '/api/img/1' }],
      },
      referenceImageIndex: 3,
      selectedExportIndexes: [3],
    });

    expect(design?.designResultGroups['详情图']).toEqual([
      { id: 'legacy-3', aspectRatio: '3:4', status: 'ready', url: '/api/img/1' },
    ]);
    expect(design?.referenceImageId).toBeNull();
    expect(design?.selectedExportIds).toBeUndefined();
  });

  it('主图设计快照同样读写文案标准参考图点选，且不落导出勾选', async () => {
    const snapshot = await createDesignStepSnapshot(
      { ...DEFAULT_DESIGN_FORM_STATE, taskType: '主图' },
      { 主图: [{ id: 'm-1', aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }] },
      [],
      { referenceImageId: 'm-1' },
    );
    const design = readDesignStepSnapshot(snapshot);

    expect(design?.referenceImageId).toBe('m-1');
    expect(design?.selectedExportIds).toBeUndefined();
  });

  it('键序不同的同一份快照判为相同，数组顺序仍参与比较', () => {
    expect(isSameStepSnapshot({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(isSameStepSnapshot({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(isSameStepSnapshot({ a: 1 }, { a: 2 })).toBe(false);
    expect(isSameStepSnapshot({ a: 1 }, undefined)).toBe(false);
  });

  it('设计快照经落库往返后判为未变化，首次进入点下一步不触发保存', async () => {
    const created = await createDesignStepSnapshot(
      { ...DEFAULT_DESIGN_FORM_STATE, taskType: '主图' },
      { 主图: [{ id: 'm-1', aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }] },
      [],
      { images: [IMAGE_ITEM('p-1', 'product.png')], referenceImageId: null },
    );
    const roundTrip = readDesignStepSnapshot(JSON.parse(JSON.stringify(created)));

    expect(roundTrip).toBeDefined();
    expect(isSameStepSnapshot(created, roundTrip)).toBe(true);
  });

  it('分析快照经落库往返后判为未变化，首次进入点下一步不触发保存', async () => {
    const created = await createAnalysisStepSnapshot(
      [IMAGE_ITEM('p-1', 'product.png')],
      [],
      '分析正文',
      {
        planCards: [{ themeId: 'product', title: '产品展示', requirement: '特写' }],
        selectedThemeIds: ['product'],
        productDocs: [],
      },
    );
    const roundTrip = readAnalysisStepSnapshot(JSON.parse(JSON.stringify(created)));

    expect(roundTrip).toBeDefined();
    expect(isSameStepSnapshot(created, roundTrip)).toBe(true);
  });

  it('再次进入流程时按任务类型停在对应的第一步', () => {
    expect(resolveInitialStudioPhase(undefined, true)).toBe('visual');
    expect(resolveInitialStudioPhase(undefined, false, true)).toBe('input');
    expect(resolveInitialStudioPhase(undefined, false, true, true)).toBe('design');
    expect(
      resolveInitialStudioPhase(
        {
          images: [],
          documents: [],
          analysisText: '## 产品展示\n特写\n拍摄场景：浅木台面。',
          planCards: [
            {
              themeId: 'product',
              title: '产品展示',
              requirement: '特写\n拍摄场景：浅木台面。',
            },
          ],
        },
        false,
        true,
      ),
    ).toBe('analyzed');
  });

  it('任务类型既非主题规划类也非海报时抛错，不返回兜底步骤', () => {
    expect(() => resolveInitialStudioPhase(undefined)).toThrow();
    expect(() =>
      resolveInitialStudioPhase({ images: [], documents: [], analysisText: '已完成分析' }),
    ).toThrow();
  });
});

describe('流程导航', () => {
  it('分析、主视觉、视觉设计与完成依次流转', () => {
    expect(phaseAfterNext('analyzed')).toBe('visual');
    expect(phaseAfterNext('visual')).toBe('design');
    expect(phaseAfterNext('design')).toBe('complete');
    expect(phaseAfterPrev('complete')).toBe('design');
    expect(phaseAfterPrev('designGenerating')).toBe('visual');
    expect(phaseAfterPrev('visual')).toBe('analyzed');
    expect(phaseAfterPrev('visual', true)).toBe('visual');
    expect(phaseAfterNext('analyzed', true)).toBe('design');
    expect(phaseAfterPrev('complete', false, true)).toBe('design');
    expect(phaseAfterPrev('designGenerating', false, true)).toBe('analyzed');
    expect(phaseAfterPrev('design', false, true)).toBe('analyzed');
  });

  it('上一步按钮：详情图在分析步隐藏，海报在主视觉步隐藏，主图在分析步隐藏', () => {
    expect(isPrevVisible('analyzed')).toBe(false);
    expect(isPrevVisible('design')).toBe(true);
    expect(isPrevVisible('designGenerating')).toBe(true);
    expect(isPrevVisible('complete')).toBe(true);
    expect(isPrevVisible('visual')).toBe(true);
    expect(isPrevVisible('visual', true)).toBe(false);
    expect(isPrevVisible('visualGenerating', true)).toBe(false);
    expect(isPrevVisible('design', true)).toBe(true);
  });

  it('视觉设计至少有一张成果时才能进入完成', () => {
    expect(isNextDisabled('design', null, false)).toBe(true);
    expect(isNextDisabled('design', null, true)).toBe(false);
  });

  it('主图分析未点选主题时不能进入设计', () => {
    expect(isNextDisabled('analyzed', null, false, { selectedThemeCount: 0 })).toBe(true);
    expect(isNextDisabled('analyzed', null, false, { selectedThemeCount: 2 })).toBe(false);
  });

  it('主图设计步标题与空态不走视觉设计文案', () => {
    expect(toResultHeadTitle('design', '主图')).toBe('主图设计');
    expect(toEmptyHint('design', '主图')).toBe('设置参数后点击「生成主图」');
    expect(toResultHeadTitle('analyzed', '主图')).toBe('主图分析');
    expect(toEmptyHint('input', '主图')).toBe('上传商业分析或填写主图说明，点击「开始分析」');
    expect(toResultHeadTitle('design', '详情图')).toBe('详情图设计');
    expect(toResultHeadTitle('analyzed', '详情图')).toBe('详情图分析');
    expect(toEmptyHint('input', '详情图')).toBe('上传商业分析，点击「开始分析」');
    expect(toEmptyHint('design', '详情图')).toBe('设置参数后点击「生成详情图」');
  });
});

describe('isSameStepSnapshot', () => {
  it('无基线视为已变化', () => {
    expect(isSameStepSnapshot({ analysisText: 'a' }, undefined)).toBe(false);
  });

  it('分析正文变化则不相等', () => {
    const baseline = { images: [], documents: [], analysisText: '旧稿' };
    expect(isSameStepSnapshot({ ...baseline, analysisText: '新稿' }, baseline)).toBe(false);
    expect(isSameStepSnapshot(baseline, baseline)).toBe(true);
  });

  it('选中 id 变化则不相等', () => {
    const baseline = {
      form: DEFAULT_FORM_STATE,
      visualImages: [{ id: 'v-1', aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }],
      selectedVisualId: 'v-1',
    };
    expect(isSameStepSnapshot({ ...baseline, selectedVisualId: 'v-2' }, baseline)).toBe(false);
    expect(isSameStepSnapshot(baseline, baseline)).toBe(true);
  });

  it('结果 URL 变化则不相等', () => {
    const baseline = {
      form: DEFAULT_DESIGN_FORM_STATE,
      designResultGroups: {
        主图: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/old' }],
      },
      modelImages: [],
    };
    const next = {
      ...baseline,
      designResultGroups: {
        主图: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/new' }],
      },
    };
    expect(isSameStepSnapshot(next, baseline)).toBe(false);
  });
});
