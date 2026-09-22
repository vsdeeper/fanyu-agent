import { describe, expect, it } from 'vitest';
import {
  buildPreviewSlides,
  formatLegacyCardsToBody,
  groupImagesByAspectRatio,
  normalizeCardBody,
  parseCaptionFromBody,
  stripCaptionFromBody,
  stripMarkdownFence,
  titleFromBody,
} from './utils';
import type { ImageTextCard, ImageTextGeneratedImage } from './types';

const cards: ImageTextCard[] = [
  { id: 'a', title: '封面', prompt: '封面画面', caption: '封面配文' },
  { id: 'b', title: '细节', prompt: '细节画面', caption: '细节配文' },
];

function image(
  id: string,
  cardId: string,
  aspectRatio: string,
  createdAt: string,
  selected = false,
): ImageTextGeneratedImage {
  return { id, cardId, aspectRatio, url: `/${id}`, selected, createdAt };
}

describe('normalizeCardBody', () => {
  it('去掉 markdown 围栏并保留正文', () => {
    expect(normalizeCardBody('```markdown\n# 标题\n\n要点\n```')).toBe('# 标题\n\n要点');
    expect(stripMarkdownFence('```\n正文\n```')).toBe('正文');
  });

  it('空正文返回 null', () => {
    expect(normalizeCardBody('   ')).toBeNull();
    expect(normalizeCardBody('```\n```')).toBeNull();
  });

  it('旧卡片可拼成可读正文', () => {
    expect(formatLegacyCardsToBody(cards, '暖调静物')).toContain('# 封面');
    expect(formatLegacyCardsToBody(cards, '暖调静物')).toContain('## 细节');
    expect(formatLegacyCardsToBody(cards, '暖调静物')).toContain('封面配文');
  });

  it('从正文提取一级标题', () => {
    expect(titleFromBody('# 晨间咖啡\n\n正文')).toBe('晨间咖啡');
    expect(titleFromBody('没有标题')).toBeUndefined();
  });
});

describe('配文解析与剥离', () => {
  const sample = `# 晨间咖啡

> 一杯好咖啡，唤醒清醒的早晨。

## 风味
低酸、坚果香。

## 冲煮
90℃，15 克粉。`;

  it('从标题后的 > 引用读取摘要', () => {
    expect(parseCaptionFromBody(sample)).toBe('一杯好咖啡，唤醒清醒的早晨。');
  });

  it('剥离配文后保留标题与其它小节，供生图提示', () => {
    const prompt = stripCaptionFromBody(sample);
    expect(prompt).toContain('# 晨间咖啡');
    expect(prompt).toContain('## 风味');
    expect(prompt).not.toContain('>');
    expect(prompt).not.toContain('唤醒清醒的早晨');
  });

  it('兼容旧 ## 配文 小节，并去掉行首 >', () => {
    const legacy = `# 晨间咖啡

## 配文
> 旧版配文摘要

## 风味
低酸。`;
    expect(parseCaptionFromBody(legacy)).toBe('旧版配文摘要');
    expect(stripCaptionFromBody(legacy)).not.toContain('## 配文');
  });

  it('无配文时原样返回', () => {
    expect(parseCaptionFromBody('# 标题\n\n正文')).toBeUndefined();
    expect(stripCaptionFromBody('# 标题\n\n正文')).toBe('# 标题\n\n正文');
  });
});

describe('图文出图分组与预览顺序', () => {
  it('仅按比例分组，组内按出图时间', () => {
    const groups = groupImagesByAspectRatio([
      image('2', 'a', '1:1', '2026-01-02'),
      image('1', 'a', '3:4', '2026-01-01'),
      image('3', 'b', '3:4', '2026-01-03'),
      image('4', 'b', '1:1', '2026-01-04'),
    ]);
    expect(groups.map((group) => group.ratio)).toEqual(['3:4', '1:1']);
    expect(groups[0]?.images.map((item) => item.id)).toEqual(['1', '3']);
    expect(groups[1]?.images.map((item) => item.id)).toEqual(['2', '4']);
  });

  it('预览只收勾选图，按出图时间；配文不挂在 slide 上', () => {
    const slides = buildPreviewSlides([
      {
        ...image('late', 'a', '3:4', '2026-01-03', true),
        cardTitle: '封面',
        cardCaption: '封面配文',
      },
      {
        ...image('early', 'a', '1:1', '2026-01-01', true),
        cardTitle: '封面',
        cardCaption: '封面配文',
      },
      image('skip', 'b', '3:4', '2026-01-02', false),
    ]);
    expect(slides.map((slide) => slide.id)).toEqual(['early', 'late']);
    expect(slides[0]).toEqual({ id: 'early', url: '/early', title: '封面' });
  });
});
