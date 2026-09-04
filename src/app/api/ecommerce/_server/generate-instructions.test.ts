import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { DEFAULT_MODEL_REQUIREMENT } from '@/app/api/ecommerce/_shared/constants';
import {
  buildModelHelpWriteInstructions,
  buildModelIdentityVisionPrompt,
  buildModelPrompt,
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
});

describe('产品多视角请求契约', () => {
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
});
