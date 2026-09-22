export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const RESEARCH_TRUNCATED = '选题调研输出被截断，请重试';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const PLAN_TRUNCATED = '内容思路输出被截断，请重试生成';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const DRAFT_TRUNCATED = '成稿输出被截断，请重试生成';
export const IMAGES_FAILED = '配图规划失败，请稍后重试';
export const IMAGES_TRUNCATED = '配图规划输出被截断，请重试';
export const MISSING_RESEARCH_INPUT = '请至少填写我的想法、我的观点或我的经历之一';
/** 配图规划输出上限（带标注正文 + JSON）。 */
export const WECHAT_ARTICLE_IMAGES_MAX_OUTPUT_TOKENS = 16384;
/**
 * 调研输出上限（简报 + sources/angles JSON）。
 * 思考模型 reasoning 与正文同预算；过小易在 JSON 写完前被截断。
 */
export const WECHAT_ARTICLE_RESEARCH_MAX_OUTPUT_TOKENS = 16384;

/** 选题调研允许的检索轮数（每轮可并行多次 web_search）；超过后强制只写简报 */
export const RESEARCH_MAX_SEARCH_ROUNDS = 3;
/** 有「我的经历」时：按需检索，轮次上限更低，避免挤掉叙事切入 */
export const RESEARCH_NARRATIVE_MAX_SEARCH_ROUNDS = 1;
/** 选题调研总步数上限：检索轮 + 写简报，避免只搜不写撞到空正文 */
export const RESEARCH_MAX_STEPS = 6;
/**
 * plan 输出上限。思考模型会把 reasoning 与正文计入同一预算；
 * 过小易在 JSON 写完前被 length 截断。
 */
export const WECHAT_ARTICLE_PLAN_MAX_OUTPUT_TOKENS = 8192;
/**
 * draft 输出上限。公众号正文远长于思路 JSON，且 reasoning 占同一预算；
 * 取较大档避免长文 finishReason=length。
 *
 * 不按「篇幅下限」分档：篇幅只是提示词里的下限约束，2×字数 + reasoning/JSON 余量在界面上限
 * （5000 字）内始终低于本值，分档等于恒定；真往下压只会让正文被截断，且输出按实际 token 计费，
 * 压低上限也省不下成本。
 */
export const WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS = 32768;
