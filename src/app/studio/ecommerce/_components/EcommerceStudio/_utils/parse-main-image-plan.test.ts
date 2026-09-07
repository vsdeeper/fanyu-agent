import { describe, expect, it } from 'vitest';
import { parseMainImagePlan } from './parse-main-image-plan';

const SAMPLE = `## 套图视觉规范
冷白主导，强调蓝只用于标题。Logo 左上。

## 产品展示
主标题：桌面小台扇
特写产品材质与体积感。

## 核心卖点
主标题：三档强风
辅：覆盖桌面。

## 功能特点
主标题：左右摇头送风

## 使用场景
午后书桌办公。

## 用户价值
清凉不占地方。
`;

describe('parseMainImagePlan', () => {
  it('按固定标题切出视觉规范与五张卡', () => {
    const parsed = parseMainImagePlan(SAMPLE);
    expect(parsed.visualLock).toContain('冷白主导');
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'product',
      'sellingPoint',
      'feature',
      'scene',
      'value',
    ]);
    expect(parsed.cards[0]?.requirement).toContain('桌面小台扇');
  });

  it('流式半成品只保留已出现的完整节', () => {
    const parsed = parseMainImagePlan('## 套图视觉规范\n冷白\n\n## 产品展示\n特写');
    expect(parsed.visualLock).toBe('冷白');
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0]?.themeId).toBe('product');
  });

  it('忽略无法识别的标题', () => {
    const parsed = parseMainImagePlan('## 其它\n不要\n\n## 核心卖点\n强风');
    expect(parsed.visualLock).toBe('');
    expect(parsed.cards).toEqual([
      { themeId: 'sellingPoint', title: '核心卖点', requirement: '强风' },
    ]);
  });
});
