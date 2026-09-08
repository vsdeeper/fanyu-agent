import { describe, expect, it } from 'vitest';
import { parseDetailImagePlan } from './parse-detail-image-plan';

const SAMPLE = `## 品牌认知
设计目标：建立品牌第一印象。
展示重点：
- Logo 与一句定位。

## 核心卖点
设计目标：说清主主张。
展示重点：
- 一个卖点视觉化。

## 产品细节
设计目标：展示材质与工艺。
展示重点：
- 近景纹理特写。

## 功能展示
设计目标：看见机制发生。
展示重点：
- 结构或气流示意。

## 使用场景
设计目标：放进真实生活。
展示重点：
- 书桌办公现场。

## 购买理由
设计目标：收束购买动机。
展示重点：
- 体验结果与安心感。
`;

describe('parseDetailImagePlan', () => {
  it('按固定标题切出六张卡', () => {
    const parsed = parseDetailImagePlan(SAMPLE);
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'brand',
      'sellingPoint',
      'detail',
      'feature',
      'scene',
      'reason',
    ]);
    expect(parsed.cards[0]?.requirement).toContain('建立品牌第一印象');
  });

  it('流式半成品只保留已出现的完整节', () => {
    const parsed = parseDetailImagePlan('## 品牌认知\n目标\n\n## 核心卖点\n卖点');
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0]?.themeId).toBe('brand');
    expect(parsed.cards[1]?.themeId).toBe('sellingPoint');
  });

  it('忽略无法识别的标题', () => {
    const parsed = parseDetailImagePlan('## 其它\n不要\n\n## 核心卖点\n卖点');
    expect(parsed.cards).toEqual([
      {
        themeId: 'sellingPoint',
        title: '核心卖点',
        requirement: '展示重点：\n- 卖点',
      },
    ]);
  });
});
