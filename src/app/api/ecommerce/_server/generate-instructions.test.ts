import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEFAULT_MODEL_REQUIREMENT,
  ECOMMERCE_DESIGN_TYPES,
} from '@/app/api/ecommerce/_shared/constants';
import {
  buildDesignPrompt,
  buildModelHelpWriteInstructions,
  buildModelIdentityVisionPrompt,
  buildModelPrompt,
  buildProductModelPrompt,
  buildProductMultiviewPrompt,
  buildProductRefinePrompt,
  buildProductViewPrompt,
  buildVisualPrompt,
} from './generate-instructions';
import { parseGenerateBody } from './parse-request';

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
  });

  it('未填写模特要求时使用共享默认要求', () => {
    expect(buildModelPrompt('', false)).toContain(DEFAULT_MODEL_REQUIREMENT);
  });

  it('多张模特照片共同锁定同一人物外貌但不继承源照片姿态', () => {
    const prompt = buildModelPrompt('', true);

    expect(prompt).toContain('全部照片均视为同一人物在不同角度下的外貌参考');
    expect(prompt).toContain('综合全部照片锁定并补全该人物');
    expect(prompt).toContain('四格必须保持同一人物、身份稳定');
    expect(prompt).toContain('不得沿用任一照片的姿态、肢体动作、身体朝向');
    expect(prompt).not.toContain('五官、肤色、发型、体态、气质');
  });

  it('产品模特始终使用固定四格目标视角', () => {
    const prompt = buildModelPrompt('', true);

    expect(prompt).toContain('构图与姿态的唯一标准');
    expect(prompt).toContain('左侧为胸以上半身特写、身体正面朝向镜头');
    expect(prompt).toContain('从左到右严格依次为正视、侧视、背视');
  });

  it('帮写与身份识图均排除参考照片姿态', () => {
    const instructions = buildModelHelpWriteInstructions();
    const visionPrompt = buildModelIdentityVisionPrompt();

    expect(instructions).toContain('仅根据识图结果描述参考人物的性别');
    expect(instructions).toContain('不得描述或沿用参考图中的姿态、动作');
    expect(instructions).toContain('左侧胸以上正面特写，右侧依次为正视、侧视、背视全身自然站姿');
    expect(visionPrompt).toContain('同一人物多角度身份参考照片中的一张');
    expect(visionPrompt).toContain('可用于跨角度保持身份一致的外貌特征');
    expect(visionPrompt).toContain('不要描述人物当前的姿态、动作');
  });

  it.each(ECOMMERCE_DESIGN_TYPES)('视觉设计为“%s”时包含类型要求与商业分析', (designType) => {
    const prompt = buildDesignPrompt(designType, '目标人群偏好暖色', true, true);

    expect(prompt).toContain(`“${designType}”视觉设计成品`);
    expect(prompt).toContain('【商业分析】\n目标人群偏好暖色');
    expect(prompt).toContain('第1个参考图=用户上传的产品图');
    expect(prompt).toContain('第2个参考图=已选营销主视觉');
    expect(prompt).toContain('第3个参考图=已选模特标准图');
  });

  it('视觉设计参考图编号随开关保持一致', () => {
    const prompt = buildDesignPrompt('主图', '分析', false, true);

    expect(prompt).toContain('未带入营销主视觉');
    expect(prompt).toContain('第2个参考图=已选模特标准图');
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
    designType: '主图',
    analysisText: '商业分析',
    productViewDataUrl: 'data:image/png;base64,PRODUCT',
  } as const;

  it('接受商业分析、产品标准图和两个已开启的可选参考', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      referenceVisual: true,
      includeModel: true,
      visualDataUrl: 'data:image/png;base64,VISUAL',
      modelDataUrl: 'data:image/png;base64,MODEL',
    });

    expect(parsed?.kind).toBe('design');
  });

  it('两个开关关闭时仅需产品标准图', () => {
    const parsed = parseGenerateBody({
      ...BASE_DESIGN_REQUEST,
      referenceVisual: false,
      includeModel: false,
    });

    expect(parsed?.kind).toBe('design');
  });

  it('拒绝开关与参考图不一致的请求', () => {
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        referenceVisual: true,
        includeModel: false,
      }),
    ).toBeNull();
    expect(
      parseGenerateBody({
        ...BASE_DESIGN_REQUEST,
        referenceVisual: false,
        includeModel: false,
        visualDataUrl: 'data:image/png;base64,VISUAL',
      }),
    ).toBeNull();
  });
});
