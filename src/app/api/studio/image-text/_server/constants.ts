export const PLAN_FAILED = '图文内容生成失败，请稍后重试';
export const PLAN_TRUNCATED = '图文内容输出被截断，请重试';
export const MISSING_INPUT = '请上传素材图、素材文件或填写内容';

/**
 * 内容输出上限。思考模型把 reasoning 与 Markdown 正文计入同一预算；
 * 8192 易在可见正文写完前 finishReason=length（日志常见仅数百～千余字）。
 * 与长文成稿同档，输出按实际 token 计费，抬高上限不额外加成本。
 */
export const IMAGE_TEXT_PLAN_MAX_OUTPUT_TOKENS = 32768;
