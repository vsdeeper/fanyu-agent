export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const RESEARCH_TRUNCATED = '选题调研输出被截断，请重试';
export const STRUCTURE_FAILED = '故事结构生成失败，请稍后重试';
export const STRUCTURE_TRUNCATED = '故事结构输出被截断，请重试生成';
export const VOLUME_CHAPTERS_FAILED = '卷内章纲生成失败，请稍后重试';
export const VOLUME_CHAPTERS_TRUNCATED = '卷内章纲输出被截断，请重试生成';
export const CHAPTER_BEATS_FAILED = '章内节拍生成失败，请稍后重试';
export const CHAPTER_BEATS_TRUNCATED = '章内节拍输出被截断，请重试生成';
export const WRITING_FAILED = '正文生成失败，请稍后重试';
export const WRITING_TRUNCATED = '正文输出被截断，请重试生成';
export const MISSING_RESEARCH_INPUT = '请先填写我的想法';
export const MISSING_STRUCTURE_INPUT = '请先选定选题并确认体量';
export const MISSING_VOLUME_CHAPTERS_INPUT = '请提供有效的卷信息';
export const MISSING_CHAPTER_BEATS_INPUT = '请提供有效的章节信息';
export const MISSING_WRITING_INPUT = '请提供有效的写作单元';

/** 调研输出上限（简述 + topics JSON）。 */
export const NOVEL_RESEARCH_MAX_OUTPUT_TOKENS = 8192;
/** 结构输出上限。 */
export const NOVEL_STRUCTURE_MAX_OUTPUT_TOKENS = 8192;
/** 按卷章纲输出上限。 */
export const NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS = 8192;
/** 章内节拍输出上限。 */
export const NOVEL_CHAPTER_BEATS_MAX_OUTPUT_TOKENS = 4096;
/** 单节拍正文输出上限（约 2000 字 + reasoning）。 */
export const NOVEL_WRITING_MAX_OUTPUT_TOKENS = 24576;
