import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { REWRITE_CARD_POLISH_TEMPERATURE, REWRITE_CARD_RANDOM_TEMPERATURE } from './constants';
import { buildRewriteCardInstructions } from './rewrite-card-instructions';
import {
  buildRewriteCardPrompt,
  rewriteCardTemperature,
  sanitizeRewriteCardOutput,
} from './rewrite-card-prompt';

const OTHER_CARDS = [
  {
    themeId: 'sellingPoint',
    title: '核心卖点',
    requirement: '设计目标：主主张\n展示重点：斜侧看清卖点',
  },
  {
    themeId: 'detail',
    title: '产品细节',
    requirement: '设计目标：材质特写\n展示重点：近景看釉面',
  },
];

describe('rewriteCardTemperature', () => {
  it('有草稿用润色温度', () => {
    expect(rewriteCardTemperature('强调釉面')).toBe(REWRITE_CARD_POLISH_TEMPERATURE);
  });

  it('无草稿用随机温度', () => {
    expect(rewriteCardTemperature('')).toBe(REWRITE_CARD_RANDOM_TEMPERATURE);
    expect(rewriteCardTemperature('   ')).toBe(REWRITE_CARD_RANDOM_TEMPERATURE);
  });
});

describe('buildRewriteCardPrompt（详情图）', () => {
  it('有草稿走润色分支，并带上其它屏互斥段', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'detailImage',
      themeId: 'brand',
      draft: '强调釉面质感',
      otherCards: OTHER_CARDS,
      analysisText: '高端陶瓷餐具，定位轻奢。',
    });

    expect(prompt).toContain('【当前屏】品牌认知');
    expect(prompt).toContain('【用户草稿】');
    expect(prompt).toContain('强调釉面质感');
    expect(prompt).not.toContain('【随机生成】');
    expect(prompt).toContain('## 核心卖点');
    expect(prompt).toContain('斜侧看清卖点');
    expect(prompt).toContain('## 产品细节');
    expect(prompt).toContain('请只输出当前屏正文');
    expect(prompt).toContain('设计目标：');
    expect(prompt).toContain('展示重点：');
    expect(prompt).toContain('- 中景展示整机全貌');
  });

  it('无草稿走随机生成，不依赖用户草稿', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'detailImage',
      themeId: 'scene',
      draft: '  ',
      otherCards: OTHER_CARDS,
      analysisText: '办公桌使用场景。',
    });

    expect(prompt).toContain('【当前屏】使用场景');
    expect(prompt).toContain('【随机生成】');
    expect(prompt).not.toContain('【用户草稿】');
    expect(prompt).toContain('必须互斥');
  });

  it('当前屏出现在其它卡时从互斥段剔除', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'detailImage',
      themeId: 'brand',
      draft: '',
      otherCards: [
        {
          themeId: 'brand',
          title: '品牌认知',
          requirement: '不应出现在互斥段',
        },
        ...OTHER_CARDS,
      ],
      analysisText: '分析',
    });

    expect(prompt).not.toContain('不应出现在互斥段');
    expect(prompt).toContain('## 核心卖点');
  });
});

describe('buildRewriteCardPrompt（主图）', () => {
  it('按主图域取标题、职责与样例，措辞论「张」', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'mainImage',
      themeId: 'product',
      draft: '突出哑光质感',
      otherCards: OTHER_CARDS,
      analysisText: '保温杯，主打便携。',
    });

    expect(prompt).toContain('【当前张】产品展示');
    expect(prompt).toContain('【本张职责】设计目标写第一眼印象');
    expect(prompt).toContain('【用户草稿】');
    expect(prompt).toContain('突出哑光质感');
    expect(prompt).toContain('【其它张（必须互斥，禁止复用其卖点、细节、场景、机位）】');
    expect(prompt).not.toContain('【其它屏');
    expect(prompt).toContain('请只输出当前张正文');
    expect(prompt).not.toContain('请只输出当前屏正文');
    expect(prompt).toContain('- 正视特写杯身整体轮廓');
    expect(prompt).not.toContain('- 中景展示整机全貌');
  });

  it('无草稿随机生成，其它张为空时给出占位提示', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'mainImage',
      themeId: 'value',
      draft: '',
      otherCards: [],
      analysisText: '保温杯，主打便携。',
    });

    expect(prompt).toContain('【当前张】用户价值');
    expect(prompt).toContain('【随机生成】');
    expect(prompt).toContain('为本张职责换一个新的信息切片');
    expect(prompt).toContain('（暂无其它张）');
  });

  it('带产品资料时在商业分析后插入【产品资料】段', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'mainImage',
      themeId: 'product',
      draft: '突出哑光质感',
      otherCards: [],
      analysisText: '保温杯，主打便携。',
      productDocumentsText: '容量 500ml，品牌 凡域。',
    });

    expect(prompt).toContain('【商业分析】\n保温杯，主打便携。');
    expect(prompt).toContain('【产品资料】\n容量 500ml，品牌 凡域。');
    expect(prompt.indexOf('【商业分析】')).toBeLessThan(prompt.indexOf('【产品资料】'));
  });

  it('无产品资料时不出现【产品资料】段', () => {
    const prompt = buildRewriteCardPrompt({
      kind: 'mainImage',
      themeId: 'product',
      draft: '',
      otherCards: [],
      analysisText: '保温杯，主打便携。',
    });

    expect(prompt).not.toContain('【产品资料】');
  });
});

describe('buildRewriteCardInstructions', () => {
  it('详情图只写当前屏，不含六屏标题清单', () => {
    const instructions = buildRewriteCardInstructions('detailImage', 'feature');

    expect(instructions).toContain('当前屏标题：功能展示');
    expect(instructions).toContain('看见机制如何发生');
    expect(instructions).toContain('只输出当前屏正文');
    expect(instructions).toContain('展示重点：');
    expect(instructions).toContain('- ……（1～3 条，每条单独一行、以 "- " 开头）');
    expect(instructions).not.toContain('恰好六个二级标题');
    expect(instructions).not.toContain('## 品牌认知');
  });

  it('主图只写当前张，职责与详情图同名主题不同', () => {
    const instructions = buildRewriteCardInstructions('mainImage', 'product');

    expect(instructions).toContain('当前张标题：产品展示');
    expect(instructions).toContain('本张职责：设计目标写第一眼印象');
    expect(instructions).toContain('只输出当前张正文');
    expect(instructions).toContain('- 正视特写杯身整体轮廓');
    expect(instructions).not.toContain('恰好五个二级标题');
    expect(instructions).not.toContain('## 产品展示');
  });
});

describe('sanitizeRewriteCardOutput', () => {
  it('收成设计目标加展示重点列表', () => {
    const raw = '```markdown\n设计目标：建立印象\n展示重点：中景全貌\n```';
    expect(sanitizeRewriteCardOutput(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });

  it('去掉误加的二级标题', () => {
    const raw = '## 品牌认知\n设计目标：建立印象\n展示重点：中景全貌';
    expect(sanitizeRewriteCardOutput(raw)).toBe(
      ['设计目标：建立印象', '展示重点：', '- 中景全貌'].join('\n'),
    );
  });

  it('多行展示重点收成列表', () => {
    const raw = [
      '设计目标：看一眼便知风量覆盖柔劲两档',
      '展示重点：斜侧微距捕捉扇叶直径与机身比例关系',
      '展示重点：正视机顶按键特写，手指指示循环逻辑',
      '展示重点：侧逆光带出扇叶转动层次的柔风与强风对比',
    ].join('\n');
    expect(sanitizeRewriteCardOutput(raw)).toBe(
      [
        '设计目标：看一眼便知风量覆盖柔劲两档',
        '展示重点：',
        '- 斜侧微距捕捉扇叶直径与机身比例关系',
        '- 正视机顶按键特写，手指指示循环逻辑',
        '- 侧逆光带出扇叶转动层次的柔风与强风对比',
      ].join('\n'),
    );
  });

  it('空白输出得到空串', () => {
    expect(sanitizeRewriteCardOutput('   \n  ')).toBe('');
  });
});
