export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const MISSING_IDEA = '请先填写一句话想法';

/** 选题调研允许的检索轮数（每轮可并行多次 web_search）；超过后强制只写简报 */
export const RESEARCH_MAX_SEARCH_ROUNDS = 3;
/** 选题调研总步数上限：检索轮 + 写简报，避免只搜不写撞到空正文 */
export const RESEARCH_MAX_STEPS = 6;
