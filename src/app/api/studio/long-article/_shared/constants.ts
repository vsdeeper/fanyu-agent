import type { LongArticleGenre } from './types';

/** 长文工作室 SSE 事件名（research / plan / draft 共用）。 */
export const LONG_ARTICLE_SSE_EVENT = {
  text: 'text',
  done: 'done',
  error: 'error',
} as const;

/** 长文写作文体枚举（与请求体 articleGenre 对齐）。 */
export const LONG_ARTICLE_GENRES = [
  'popular-science',
  'knowledge-story',
  'commentary',
  'narrative',
] as const;

/** 文体展示文案（Client / Server 共用）。 */
export const LONG_ARTICLE_GENRE_LABEL: Record<LongArticleGenre, string> = {
  'popular-science': '科普',
  'knowledge-story': '知识故事',
  commentary: '观点评论',
  narrative: '叙事散文',
};

/**
 * 成稿正文末尾「参考来源」二级标题文案（不含 `## `）。
 * Client 按此标题拆分正文与来源区；Server 指令必须使用同一文案。
 */
export const DRAFT_REFERENCES_HEADING = '参考来源';
