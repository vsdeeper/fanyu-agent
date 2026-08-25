/** 默认下载文件名 */
export const DEFAULT_DESIGN_MD_FILENAME = 'DESIGN.md';

/** 落盘与下载使用的 Markdown MIME */
export const DESIGN_MD_MIME_TYPE = 'text/markdown; charset=utf-8';

/** chatId / assetId 允许字符，防止路径穿越 */
export const DOC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** save_design_md 正文长度上限（字符） */
export const DESIGN_MD_MAX_CHARS = 100_000;

/** 下载文件名：字母数字、点、下划线、连字符、中文，须以 .md 结尾 */
export const DESIGN_MD_FILENAME_PATTERN = /^[\w.\u4e00-\u9fff-]{1,80}\.md$/u;
