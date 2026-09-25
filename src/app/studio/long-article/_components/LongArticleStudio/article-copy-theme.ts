/**
 * 平台图文编辑器粘贴用内联样式（只认 style=，不认 class 或 style 标签）。
 * 固定一套贴近手机阅读的排版，避免粘贴后手工重排。
 */
export const ARTICLE_COPY_STYLES = {
  section:
    'margin:0;padding:0;max-width:100%;font-size:16px;color:#3f3f3f;line-height:1.75;letter-spacing:0.034em;word-wrap:break-word;',
  h1: 'margin:0 0 1em;padding:0;font-size:22px;font-weight:700;line-height:1.4;color:#1a1a1a;text-align:center;',
  h2: 'margin:1.6em 0 0.75em;padding:0;font-size:18px;font-weight:700;line-height:1.45;color:#1a1a1a;',
  h3: 'margin:1.4em 0 0.65em;padding:0;font-size:16px;font-weight:700;line-height:1.45;color:#1a1a1a;',
  p: 'margin:0 0 1em;padding:0;font-size:16px;line-height:1.75;color:#3f3f3f;text-align:justify;',
  strong: 'font-weight:700;color:#1a1a1a;',
  em: 'font-style:italic;',
  a: 'color:#576b95;text-decoration:none;',
  ul: 'margin:0 0 1em;padding-left:1.5em;list-style-type:disc;',
  ol: 'margin:0 0 1em;padding-left:1.5em;list-style-type:decimal;',
  li: 'margin:0.35em 0;padding:0;font-size:16px;line-height:1.75;color:#3f3f3f;',
  blockquote:
    'margin:0 0 1em;padding:0.6em 0 0.6em 0.9em;border-left:3px solid #d9d9d9;color:#666666;font-size:15px;line-height:1.7;',
  hr: 'margin:1.5em 0;border:none;border-top:1px solid #e5e5e5;height:0;',
  codespan:
    'margin:0 2px;padding:2px 5px;font-size:14px;color:#c7254e;background:#f6f6f6;border-radius:3px;word-break:break-word;',
  code: 'margin:0 0 1em;padding:12px 14px;font-size:14px;line-height:1.6;color:#3f3f3f;background:#f6f6f6;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;',
} as const;
