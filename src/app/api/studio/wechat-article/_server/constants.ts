export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const PLAN_TRUNCATED = '内容思路输出被截断，请重试生成';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const DRAFT_TRUNCATED = '成稿输出被截断，请重试生成';
export const MISSING_IDEA = '请先填写我的想法';

/** 选题调研允许的检索轮数（每轮可并行多次 web_search）；超过后强制只写简报 */
export const RESEARCH_MAX_SEARCH_ROUNDS = 3;
/** 选题调研总步数上限：检索轮 + 写简报，避免只搜不写撞到空正文 */
export const RESEARCH_MAX_STEPS = 6;
/**
 * plan 输出上限。思考模型会把 reasoning 与正文计入同一预算；
 * 过小易在 JSON 写完前被 length 截断。
 */
export const WECHAT_ARTICLE_PLAN_MAX_OUTPUT_TOKENS = 8192;
/**
 * draft 默认输出上限。公众号正文远长于思路 JSON，且 reasoning 占同一预算；
 * 对齐文风调「试写」档，避免长文 finishReason=length。
 */
export const WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS = 32768;
/** draft 输出硬顶：有篇幅下限时按字数上调，但不超过此值。 */
export const WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS_CAP = 65536;

/**
 * 按篇幅下限估算 draft maxOutputTokens。
 * 中文约 1～2 token/字，另留 reasoning 与文末 JSON 余量。
 */
export function resolveDraftMaxOutputTokens(lengthLimit?: number): number {
  if (!lengthLimit) return WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS;
  const needed = Math.ceil(lengthLimit * 2) + 8192;
  return Math.min(
    WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS_CAP,
    Math.max(WECHAT_ARTICLE_DRAFT_MAX_OUTPUT_TOKENS, needed),
  );
}
