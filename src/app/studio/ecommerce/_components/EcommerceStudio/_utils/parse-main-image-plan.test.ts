import { describe, expect, it } from 'vitest';
import { parseMainImagePlan } from './parse-main-image-plan';

const SAMPLE = `## 产品展示
设计目标：一眼记住哑光金属机身的轻巧体量。
展示重点：
- 近景台面特写整机轮廓，突出冷白金属壳
- 浅木台面，窗光侧打，留白构图

## 核心卖点
设计目标：三档强风覆盖整张书桌。
展示重点：
- 深色书桌斜俯，台灯暖光点缀，产品偏一侧

## 功能特点
设计目标：左右摇头送风全桌覆盖。
展示重点：
- 侧光剪影看摇头轨迹，深色背景，低机位

## 使用场景
设计目标：午后书桌办公的清凉搭档。
展示重点：
- 真实书房全景，显示器与文件入画，午后窗光

## 用户价值
设计目标：清凉不占地方。
展示重点：
- 窄边几角落，晨雾窗纱，产品靠墙收纳
`;

describe('parseMainImagePlan', () => {
  it('按固定标题切出五张卡，正文收成设计目标加展示重点', () => {
    const parsed = parseMainImagePlan(SAMPLE);
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'product',
      'sellingPoint',
      'feature',
      'scene',
      'value',
    ]);
    expect(parsed.cards[0]?.requirement).toBe(
      [
        '设计目标：一眼记住哑光金属机身的轻巧体量。',
        '展示重点：',
        '- 近景台面特写整机轮廓，突出冷白金属壳',
        '- 浅木台面，窗光侧打，留白构图',
      ].join('\n'),
    );
  });

  it('Markdown 里若出现「规格主图」节则照收，排在末位', () => {
    const parsed = parseMainImagePlan(
      `${SAMPLE}\n\n## 规格主图\n设计目标：白色款\n展示重点：\n- 正面平铺\n`,
    );

    // 分析指令并不要求模型写这一节，正常不会出现；万一出现，收下比丢掉更有用，
    // 客户端补卡（withMainImageSpecCard）再按 themeId 去重，不会重复追加。
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'product',
      'sellingPoint',
      'feature',
      'scene',
      'value',
      'spec',
    ]);
    expect(parsed.cards.at(-1)?.requirement).toBe('设计目标：白色款\n展示重点：\n- 正面平铺');
  });

  it('流式半成品只保留已出现的完整节', () => {
    const parsed = parseMainImagePlan('## 产品展示\n特写\n\n## 核心卖点\n强风');
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0]?.themeId).toBe('product');
    expect(parsed.cards[1]?.themeId).toBe('sellingPoint');
  });

  it('忽略无法识别的标题，含旧版套图视觉规范', () => {
    const parsed = parseMainImagePlan(
      '## 套图视觉规范\n冷白\n\n## 其它\n不要\n\n## 核心卖点\n强风\n拍摄场景：斜光书桌。',
    );
    expect(parsed.cards).toEqual([
      {
        themeId: 'sellingPoint',
        title: '核心卖点',
        requirement: '展示重点：\n- 强风\n- 拍摄场景：斜光书桌。',
      },
    ]);
  });

  it('旧格式（主标题/辅/拍摄场景）正文收敛为列表不崩溃', () => {
    const parsed = parseMainImagePlan(
      '## 产品展示\n主标题：桌面小台扇\n辅：冷白金属壳。\n拍摄场景：浅木台面近景特写，窗光侧打，留白构图。',
    );
    expect(parsed.cards).toEqual([
      {
        themeId: 'product',
        title: '产品展示',
        requirement:
          '展示重点：\n- 主标题：桌面小台扇\n- 辅：冷白金属壳。\n- 拍摄场景：浅木台面近景特写，窗光侧打，留白构图。',
      },
    ]);
  });
});
