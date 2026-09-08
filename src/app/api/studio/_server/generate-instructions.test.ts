import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import {
  buildDesignPrompt,
  buildMainImagePrompt,
  buildProductModelPrompt,
  buildProductMultiviewPrompt,
  buildProductRefinePrompt,
  buildProductViewPrompt,
  buildVisualPrompt,
} from './generate-instructions';
import { parseGenerateBody } from './parse-generate-request';

const SPEC_FIELDS = {
  model: 'gpt-image-2-vip',
  aspectRatio: '16:9',
  quality: 'high',
  clarity: '2K',
};

describe('电商生图指令', () => {
  it('独立产品精修使用用户要求并保留产品保真底线', () => {
    const prompt = buildProductRefinePrompt('清理划痕并优化金属高光');

    expect(prompt).toContain('【精修要求】\n清理划痕并优化金属高光');
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).not.toContain('【多视角要求】');
  });

  it('独立产品多视角以精修标准图为事实依据', () => {
    const prompt = buildProductMultiviewPrompt('生成正面、侧面与背面视角');

    expect(prompt).toContain('第1个参考图=已选精修标准图');
    expect(prompt).toContain('【多视角要求】\n生成正面、侧面与背面视角');
    expect(prompt).toContain('背面或被遮挡的部件不得搬移、复制或补画');
  });

  it('产品多视角先精修再出多视角且不依赖商业分析', () => {
    const prompt = buildProductViewPrompt();

    expect(prompt.indexOf('【第一阶段：产品精修】')).toBeLessThan(
      prompt.indexOf('【第二阶段：产品多视角】'),
    );
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).toContain('背面或被遮挡的部件不得搬移、复制或补画');
    expect(prompt).toContain('纯色背景和统一光线');
    expect(prompt).not.toContain('【商业分析】');
    expect(prompt).not.toContain('电影感');
  });

  it('独立产品模特以产品图确定品类、视觉气质与风格', () => {
    const prompt = buildProductModelPrompt('正面、侧面、背面三种全身视角', 2, false);

    expect(prompt).toContain('第1至第2个参考图=同一产品的事实参考');
    expect(prompt).toContain('决定模特的视觉、气质、造型、配色、光影与整体风格');
    expect(prompt).toContain('可穿戴品类');
    expect(prompt).toContain('模特须正确穿戴参考产品');
    expect(prompt).toContain('非可穿戴品类');
    expect(prompt).toContain('画面中不得出现产品本体');
    expect(prompt).toContain('只允许单行四栏横向拼图');
    expect(prompt).toContain('左侧约占总宽度40%');
    expect(prompt).toContain('右侧约占总宽度60%');
    expect(prompt).toContain('先分别生成四张解剖结构正确、自然完整的人像');
    expect(prompt).toContain('禁止为塞入窄栏而横向压扁、拉伸、扭曲身体');
    expect(prompt).toContain('侧视栏必须是自然的90度全身侧面站姿');
    expect(prompt).toContain('不得缺失、粘连躯干或长出额外肢体');
    expect(prompt).toContain('左栏半身特写姿态硬约束');
    expect(prompt).toContain('双肩保持水平且左右对称');
    expect(prompt).toContain('人物商业级修饰硬约束');
    expect(prompt).toContain('不得复刻参考图这张照片上的模糊、瑕疵');
    expect(prompt).toContain('身体中轴线与画面垂直');
    expect(prompt).toContain('禁止2×2宫格、上下两排');
    expect(prompt).toContain('【视角要求】\n正面、侧面、背面三种全身视角');
  });

  it('独立产品模特用后续参考图锁定人物身份而不继承姿态', () => {
    const prompt = buildProductModelPrompt('四格视角', 2, true);

    expect(prompt).toContain('第3个及之后的参考图=同一位模特的身份参考照片');
    expect(prompt).toContain('全部视角必须保持同一人物');
    expect(prompt).toContain('不得沿用其姿态、动作、身体朝向');
  });

  it('营销主视觉保留商业分析并叠加广告视觉规则', () => {
    const prompt = buildVisualPrompt('品牌采用克制的暖色调');

    expect(prompt).toContain('【商业分析】\n品牌采用克制的暖色调');
    expect(prompt).toContain('Logo、品牌文字、标签和图案必须原样、清晰、完整保留');
    expect(prompt).toContain('控制部件的数量、形状、颜色、尺寸和安装位置必须逐一对应原图');
    expect(prompt).toContain('电影感定向光');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('不得悬空、悬浮、漂浮');
    expect(prompt).toContain('产品与人物、场景的比例关系必须真实协调');
    expect(prompt).toContain('显著小于成人人体尺度');
    expect(prompt).toContain('文字编排');
    expect(prompt).toContain('层次分明');
    expect(prompt).not.toContain('显著小于画面主视觉');
  });

  it('电商主图以商业分析定气质、本张拍摄场景定空间、本张文案定信息', () => {
    const prompt = buildMainImagePrompt(
      '主标题：午后书桌清凉\n拍摄场景：真实书房全景，午后窗光。',
      '目标人群偏好冷白，Logo 克制',
    );

    expect(prompt).toContain(
      '【本张文案】\n主标题：午后书桌清凉\n拍摄场景：真实书房全景，午后窗光。',
    );
    expect(prompt).toContain('【商业分析】\n目标人群偏好冷白，Logo 克制');
    expect(prompt).not.toContain('【套图视觉规范】');
    expect(prompt).toContain('以【本张文案】中的拍摄场景为准');
    expect(prompt).toContain('禁止把拍摄场景说明写进画面文字');
    expect(prompt).toContain('电影感定向光');
    expect(prompt).toContain('简洁、清晰、易读');
    expect(prompt).not.toContain('必要时辅以 3～5 条卖点要点');
    expect(prompt).toContain('第1个参考图=用户上传的产品精修图');
    expect(prompt).not.toContain('已选营销主视觉');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('主图不允许悬浮创意');
    expect(prompt).toContain('字体家族、文案配色必须整套遵守【商业分析】');
    expect(prompt).toContain('构图、光影、场景与道具以本张拍摄场景为准');
  });

  it.each(ECOMMERCE_TASK_TYPES)('视觉设计为“%s”时包含类型要求与商业分析', (taskType) => {
    const prompt = buildDesignPrompt(taskType, '目标人群偏好暖色', true);

    expect(prompt).toContain(`“${taskType}”视觉设计成品`);
    expect(prompt).toContain('【商业分析】\n目标人群偏好暖色');
    expect(prompt).toContain('第1个参考图=用户上传的产品图');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
    expect(prompt).toContain('第3个及之后的参考图=同一位模特的身份与着装参考');
    expect(prompt).toContain('必须把该人物融合进成品画面并参与构图');
    expect(prompt).toContain('姿势、站位、动作与取景可按当前物料的广告设计需要调整');
    expect(prompt).toContain('产品必须稳定放置在场景中的支撑面');
    expect(prompt).toContain('产品与人物、场景的比例关系必须真实协调');
    expect(prompt).toContain('文字编排');
    expect(prompt).toContain('电影感定向光');
  });

  it('营销海报在有模特参考时将人物融入构图并锁定外貌与服装', () => {
    const prompt = buildDesignPrompt('营销海报', '分析', true);

    expect(prompt).toContain('该人物必须出现在海报中');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
    expect(prompt).toContain(
      '锁定性别、五官、脸型、肤色、发型、气质，以及服装款式、颜色、材质与关键服饰细节',
    );
    expect(prompt).toContain(
      '姿势、站位、动作与取景可按当前物料的广告设计需要调整，不必照搬参考图',
    );
    expect(prompt).not.toContain('不得沿用');
  });

  it('营销海报未带模特参考时不强制入画', () => {
    const prompt = buildDesignPrompt('营销海报', '分析', false);

    expect(prompt).not.toContain('该人物必须出现在海报中');
    expect(prompt).toContain('未带入模特参考图');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
  });
});

describe('产品多视角请求契约', () => {
  it('接受独立产品精修请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productRefine',
      ...SPEC_FIELDS,
      count: 1,
      refineRequirement: '优化材质与光影',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,AA==',
        },
      ],
    });

    expect(parsed?.kind).toBe('productRefine');
  });

  it('接受基于精修标准图的独立多视角请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productMultiview',
      ...SPEC_FIELDS,
      count: 2,
      multiviewRequirement: '统一光线生成六个角度',
      refinedImageDataUrl: 'data:image/png;base64,REFINED',
    });

    expect(parsed?.kind).toBe('productMultiview');
  });

  it('拒绝空要求或缺失精修标准图', () => {
    expect(
      parseGenerateBody({
        kind: 'productRefine',
        ...SPEC_FIELDS,
        count: 1,
        refineRequirement: ' ',
        images: [
          {
            filename: 'product.png',
            mediaType: 'image/png',
            dataUrl: 'data:image/png;base64,AA==',
          },
        ],
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        kind: 'productMultiview',
        ...SPEC_FIELDS,
        count: 1,
        multiviewRequirement: '生成六视图',
      }),
    ).toBeNull();
  });

  it('只需规格与产品图，不要求分析文本和产品要求', () => {
    const parsed = parseGenerateBody({
      kind: 'productView',
      ...SPEC_FIELDS,
      count: 1,
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,AA==',
        },
      ],
    });

    expect(parsed?.kind).toBe('productView');
  });

  it('接受产品图、视角要求和可选模特形象的独立产品模特请求', () => {
    const parsed = parseGenerateBody({
      kind: 'productModel',
      ...SPEC_FIELDS,
      count: 2,
      viewRequirement: '左侧半身，右侧正面、侧面、背面全身',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,PRODUCT',
        },
      ],
      modelImages: [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,MODEL',
        },
      ],
    });

    expect(parsed?.kind).toBe('productModel');
  });

  it('拒绝缺少产品图、空视角要求或超过三张模特图的请求', () => {
    const base = {
      kind: 'productModel',
      ...SPEC_FIELDS,
      count: 1,
      viewRequirement: '四格视角',
      images: [
        {
          filename: 'product.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,PRODUCT',
        },
      ],
    } as const;
    const modelImage = {
      filename: 'model.png',
      mediaType: 'image/png',
      dataUrl: 'data:image/png;base64,MODEL',
    };

    expect(parseGenerateBody({ ...base, images: [] })).toBeNull();
    expect(parseGenerateBody({ ...base, viewRequirement: ' ' })).toBeNull();
    expect(parseGenerateBody({ ...base, modelImages: Array(4).fill(modelImage) })).toBeNull();
  });
});

describe('视觉设计请求契约', () => {
  const BASE_DESIGN_REQUEST = {
    kind: 'design',
    ...SPEC_FIELDS,
    count: 1,
    taskType: '主图',
    analysisText: '商业分析',
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受可选模特形象参考图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      includeModel: true,
      visualDataUrl: 'data:image/png;base64,VISUAL',
      modelImages: [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,MODEL',
        },
      ],
    });

    expect(parsed?.kind).toBe('design');
    expect(parsed && parsed.kind === 'design' ? parsed.modelImages : []).toHaveLength(1);
  });

  it('未带模特时仍需主视觉参考图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      includeModel: false,
      visualDataUrl: 'data:image/png;base64,VISUAL',
    });

    expect(parsed?.kind).toBe('design');
  });

  it('拒绝缺少主视觉或模特开关与参考图不一致的请求', () => {
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        includeModel: false,
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        includeModel: true,
        visualDataUrl: 'data:image/png;base64,VISUAL',
      }),
    ).toBeNull();
  });
});

describe('营销主视觉请求契约', () => {
  const BASE_VISUAL_REQUEST = {
    kind: 'visual',
    ...SPEC_FIELDS,
    count: 1,
    analysisText: '商业分析',
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受商业分析与全部产品图', () => {
    const parsed = parseGenerateBody(BASE_VISUAL_REQUEST);

    expect(parsed?.kind).toBe('visual');
    expect(parsed && parsed.kind === 'visual' ? parsed.productViewImages : []).toHaveLength(1);
  });

  it('缺少产品图或无商业分析时拒绝', () => {
    expect(parseGenerateBody({ ...BASE_VISUAL_REQUEST, productViewImages: [] })).toBeNull();
    expect(parseGenerateBody({ ...BASE_VISUAL_REQUEST, analysisText: '' })).toBeNull();
  });
});

describe('电商主图请求契约', () => {
  const BASE_MAIN_IMAGE_REQUEST = {
    kind: 'mainImage',
    ...SPEC_FIELDS,
    count: 2,
    analysisText: '目标人群偏好冷白',
    requirements: [{ themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' }],
    productViewImages: [
      {
        filename: 'product.png',
        mediaType: 'image/png',
        dataUrl: 'data:image/png;base64,PRODUCT',
      },
    ],
  } as const;

  it('接受商业分析、主题要求与产品精修图', () => {
    const parsed = parseGenerateBody(BASE_MAIN_IMAGE_REQUEST);

    expect(parsed?.kind).toBe('mainImage');
    expect(parsed && parsed.kind === 'mainImage' ? parsed.analysisText : '').toBe(
      '目标人群偏好冷白',
    );
    expect(parsed && parsed.kind === 'mainImage' ? parsed.requirements : []).toEqual([
      { themeId: 'scene', title: '使用场景', requirement: '本轮只出使用场景' },
    ]);
  });

  it('缺少产品图、商业分析或主题要求时拒绝', () => {
    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, productViewImages: [] })).toBeNull();
    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, analysisText: ' ' })).toBeNull();
    expect(parseGenerateBody({ ...BASE_MAIN_IMAGE_REQUEST, requirements: [] })).toBeNull();
  });
});
