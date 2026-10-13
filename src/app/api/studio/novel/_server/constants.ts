export const CAST_FAILED = '角色设定生成失败，请稍后重试';
export const CAST_TRUNCATED = '角色设定输出被截断，请重试生成';
export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const RESEARCH_TRUNCATED = '选题调研输出被截断，请重试';
export const PLAN_FAILED = '创作方案生成失败，请稍后重试';
export const PLAN_TRUNCATED = '创作方案输出被截断，请重试生成';
export const VOLUME_CHAPTERS_FAILED = '卷章设计生成失败，请稍后重试';
export const VOLUME_CHAPTERS_TRUNCATED = '卷章设计输出被截断，请重试生成';
export const WRITING_FAILED = '正文生成失败，请稍后重试';
export const WRITING_TRUNCATED = '正文输出被截断，请重试生成';
export const POLISH_FAILED = '润色失败，请稍后重试';
export const POLISH_TRUNCATED = '润色输出被截断，请重试';
export const MISSING_RESEARCH_INPUT = '请上传体系设定';
export const IDEA_FILE_INVALID = '体系设定或创作方案无法读取，请重新上传';
export const MISSING_PLAN_INPUT = '请先选定选题';
export const MISSING_CAST_INPUT = '请先完成创作方案并确认选题';
export const MISSING_VOLUME_CHAPTERS_INPUT = '请提供有效的卷信息';
export const MISSING_WRITING_INPUT = '请提供有效的章节写作信息';
export const MISSING_POLISH_INPUT = '请先写好要润色的正文';

/**
 * 规划步输出上限。
 * 思考模型把 reasoning 与可见正文计入同一 maxOutputTokens；
 * 默认 reasoningEffort=max 时，过小会在写出 JSON 前被 length 截断。
 */
export const NOVEL_CAST_MAX_OUTPUT_TOKENS = 24576;
export const NOVEL_RESEARCH_MAX_OUTPUT_TOKENS = 24576;
export const NOVEL_PLAN_MAX_OUTPUT_TOKENS = 24576;
/** 一卷章卡可能有几十章，与 reasoning 共用预算，单独加大。 */
export const NOVEL_VOLUME_CHAPTERS_MAX_OUTPUT_TOKENS = 65536;
/** 单章正文输出上限；需容纳约 5000 字正文及 reasoning。 */
export const NOVEL_WRITING_MAX_OUTPUT_TOKENS = 32768;
/** 润色须整章回写，reasoning 与正文同一预算，与写作同档。 */
export const NOVEL_POLISH_MAX_OUTPUT_TOKENS = 32768;
