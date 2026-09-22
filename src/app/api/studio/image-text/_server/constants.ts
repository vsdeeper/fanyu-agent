export const PLAN_FAILED = '图文内容生成失败，请稍后重试';
export const PLAN_TRUNCATED = '图文内容输出被截断，请重试';
export const MISSING_INPUT = '请上传素材或填写内容';

/** 内容输出上限。思考模型把 reasoning 与 JSON 计入同一预算。 */
export const IMAGE_TEXT_PLAN_MAX_OUTPUT_TOKENS = 8192;
