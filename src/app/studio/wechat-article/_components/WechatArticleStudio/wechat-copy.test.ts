import { describe, expect, it } from 'vitest';
import { WECHAT_COPY_STYLES } from './wechat-copy-theme';
import { buildWechatCopyHtml, markdownToPlainText, stripLeadingArticleTitle } from './wechat-copy';

describe('buildWechatCopyHtml', () => {
  it('输出带内联 style 的小节标题、段落与加粗，去掉篇名与配图标注', () => {
    const markdown = [
      '# 主标题',
      '',
      '【配图：封面】',
      '',
      '开篇段落。',
      '',
      '## 小节一',
      '',
      '这是 **重点** 与 *强调*。',
      '',
      '【配图：插图1】',
      '',
      '结尾句。',
    ].join('\n');

    const { html, plain } = buildWechatCopyHtml(markdown);

    expect(html).toContain(`<section style="${WECHAT_COPY_STYLES.section}">`);
    expect(html).not.toContain('主标题');
    expect(html).not.toContain('<h1');
    expect(html).toContain(`<h2 style="${WECHAT_COPY_STYLES.h2}">小节一</h2>`);
    expect(html).toContain(`<p style="${WECHAT_COPY_STYLES.p}">开篇段落。</p>`);
    expect(html).toContain(`<strong style="${WECHAT_COPY_STYLES.strong}">重点</strong>`);
    expect(html).toContain(`<em style="${WECHAT_COPY_STYLES.em}">强调</em>`);
    expect(html).not.toContain('【配图');
    expect(html).not.toContain('封面');
    expect(html).not.toContain('插图1');

    expect(plain).not.toContain('主标题');
    expect(plain).toContain('小节一');
    expect(plain).toContain('重点');
    expect(plain).not.toMatch(/^#/m);
    expect(plain).not.toContain('【配图');
  });

  it('无一级标题时原样保留正文', () => {
    const { html } = buildWechatCopyHtml('只有正文一段。');
    expect(html).not.toContain('<h1');
    expect(html).toContain('只有正文一段。');
  });

  it('空正文返回空载荷', () => {
    expect(buildWechatCopyHtml('   ')).toEqual({ html: '', plain: '' });
    expect(buildWechatCopyHtml('# 仅有标题')).toEqual({ html: '', plain: '' });
  });
});

describe('stripLeadingArticleTitle', () => {
  it('只去掉开头一级标题，保留二级标题', () => {
    expect(stripLeadingArticleTitle('# 篇名\n\n## 小节\n\n正文')).toBe('## 小节\n\n正文');
  });
});

describe('markdownToPlainText', () => {
  it('去掉 Markdown 标记保留可读文本', () => {
    const plain = markdownToPlainText('# 标题\n\n见 [链接](https://a.com) 与 `code`');
    expect(plain).toBe('标题\n\n见 链接 与 code');
  });
});
