import { describe, expect, it } from 'vitest';
import { parseDetailImagePlan } from './parse-detail-image-plan';

const SAMPLE = `## 品牌认知
设计目标：建立品牌第一印象。
画面文案：
- 清新一夏
展示重点：
- Logo 与一句定位。

## 核心卖点
设计目标：说清主主张。
画面文案：
- 三档强风
展示重点：
- 一个卖点视觉化。

## 产品细节
设计目标：展示材质与工艺。
画面文案：
- 细腻釉面
展示重点：
- 近景纹理特写。

## 功能展示
设计目标：看见机制发生。
画面文案：
- 左右摇头
展示重点：
- 结构或气流示意。

## 使用场景
设计目标：放进真实生活。
画面文案：
- 午后清凉
展示重点：
- 书桌办公现场。

## 购买理由
设计目标：收束购买动机。
画面文案：
- 安心入手
展示重点：
- 体验结果与安心感。
`;

describe('parseDetailImagePlan', () => {
  it('按固定标题切出六张卡，正文含设计目标、画面文案与展示重点', () => {
    const parsed = parseDetailImagePlan(SAMPLE);
    expect(parsed.cards.map((card) => card.themeId)).toEqual([
      'brand',
      'sellingPoint',
      'detail',
      'feature',
      'scene',
      'reason',
    ]);
    expect(parsed.cards[0]?.requirement).toBe(
      [
        '设计目标：建立品牌第一印象。',
        '画面文案：',
        '- 清新一夏',
        '展示重点：',
        '- Logo 与一句定位。',
      ].join('\n'),
    );
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

  it('抽出视觉气质摘要且不把它当成主题卡', () => {
    const parsed = parseDetailImagePlan(
      `## 视觉气质摘要
冷白克制、低对比窗光。

${SAMPLE}`,
    );
    expect(parsed.visualMoodSummary).toBe('冷白克制、低对比窗光。');
    expect(parsed.cards.map((card) => card.themeId)).toHaveLength(6);
    expect(parsed.cards.some((card) => card.title === '视觉气质摘要')).toBe(false);
  });
});
