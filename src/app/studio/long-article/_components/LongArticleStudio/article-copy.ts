import { Marked, Renderer } from 'marked';
import { ARTICLE_COPY_STYLES } from './article-copy-theme';
import { stripImageMarkers } from './utils';

/** 转义 HTML 文本与属性值。 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 创建带内联样式的 marked Renderer（长文粘贴用）。 */
function createArticleRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const style =
      depth <= 1
        ? ARTICLE_COPY_STYLES.h1
        : depth === 2
          ? ARTICLE_COPY_STYLES.h2
          : ARTICLE_COPY_STYLES.h3;
    const tag = depth <= 3 ? `h${depth}` : 'h3';
    return `<${tag} style="${style}">${text}</${tag}>\n`;
  };

  renderer.paragraph = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<p style="${ARTICLE_COPY_STYLES.p}">${text}</p>\n`;
  };

  renderer.strong = function ({ tokens }) {
    return `<strong style="${ARTICLE_COPY_STYLES.strong}">${this.parser.parseInline(tokens)}</strong>`;
  };

  renderer.em = function ({ tokens }) {
    return `<em style="${ARTICLE_COPY_STYLES.em}">${this.parser.parseInline(tokens)}</em>`;
  };

  renderer.codespan = function ({ text }) {
    return `<code style="${ARTICLE_COPY_STYLES.codespan}">${escapeHtml(text)}</code>`;
  };

  renderer.code = function ({ text }) {
    return `<pre style="${ARTICLE_COPY_STYLES.code}"><code>${escapeHtml(text)}</code></pre>\n`;
  };

  renderer.blockquote = function ({ tokens }) {
    return `<blockquote style="${ARTICLE_COPY_STYLES.blockquote}">${this.parser.parse(tokens)}</blockquote>\n`;
  };

  renderer.hr = function () {
    return `<hr style="${ARTICLE_COPY_STYLES.hr}" />\n`;
  };

  renderer.list = function (token) {
    const tag = token.ordered ? 'ol' : 'ul';
    const style = token.ordered ? ARTICLE_COPY_STYLES.ol : ARTICLE_COPY_STYLES.ul;
    let body = '';
    for (const item of token.items) {
      body += this.listitem(item);
    }
    return `<${tag} style="${style}">${body}</${tag}>\n`;
  };

  renderer.listitem = function (item) {
    return `<li style="${ARTICLE_COPY_STYLES.li}">${this.parser.parse(item.tokens)}</li>`;
  };

  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const safeHref = escapeHtml(href ?? '');
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${safeHref}"${titleAttr} style="${ARTICLE_COPY_STYLES.a}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  renderer.image = function () {
    // 配图走单独「复制图片」；正文 HTML 不嵌外链图
    return '';
  };

  renderer.html = function () {
    return '';
  };

  return renderer;
}

const articleMarked = new Marked({
  gfm: true,
  breaks: false,
  renderer: createArticleRenderer(),
});

/**
 * 将成稿 Markdown 转为可读纯文本（去掉标题 # 前缀与常见行内标记）。
 * 作剪贴板 text/plain 备用，非富文本场景也能粘贴。
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 去掉正文开头的一级标题（`# 标题`）。
 * 标题在平台编辑器单独填写，一键复制只带正文与小节标题。
 */
export function stripLeadingArticleTitle(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\r\n]+(?:\r?\n)*/, '').trim();
}

/**
 * 构建可粘贴到平台编辑器的剪贴板载荷：内联样式 HTML + 纯文本备用。
 * 去掉篇名一级标题与配图标注行，保留 `##` 小节标题。
 */
export function buildArticleCopyHtml(markdown: string): { html: string; plain: string } {
  const prepared = stripLeadingArticleTitle(stripImageMarkers(markdown));
  if (!prepared) {
    return { html: '', plain: '' };
  }

  const body = articleMarked.parse(prepared, { async: false }) as string;
  const html = `<section style="${ARTICLE_COPY_STYLES.section}">${body.trim()}</section>`;
  const plain = markdownToPlainText(prepared);
  return { html, plain };
}
