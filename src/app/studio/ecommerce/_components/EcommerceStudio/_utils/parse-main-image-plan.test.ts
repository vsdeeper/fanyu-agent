import { describe, expect, it } from 'vitest';
import { parseMainImagePlan } from './parse-main-image-plan';

const SAMPLE = `## 产品展示
主标题：桌面小台扇
辅：冷白金属壳。
拍摄场景：浅木台面近景特写，窗光侧打，留白构图。

## 核心卖点
主标题：三档强风
辅：覆盖桌面。
拍摄场景：深色书桌斜俯，台灯暖光点缀，产品偏一侧。

## 功能特点
主标题：左右摇头送风
拍摄场景：侧光剪影看摇头轨迹，深色背景，低机位。

## 使用场景
主标题：午后书桌办公
拍摄场景：真实书房全景，显示器与文件入画，午后窗光。

## 用户价值
主标题：清凉不占地方
拍摄场景：窄边几角落，晨雾窗纱，产品靠墙收纳。
`;

describe('parseMainImagePlan', () => {
  it('按固定标题切出五张卡', () => {
    const parsed = parseMainImagePlan(SAMPLE);
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'product',
      'sellingPoint',
      'feature',
      'scene',
      'value',
    ]);
    expect(parsed.cards[0]?.requirement).toContain('桌面小台扇');
    expect(parsed.cards[0]?.requirement).toContain('浅木台面近景特写');
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
        requirement: '强风\n拍摄场景：斜光书桌。',
      },
    ]);
  });
});
