export const SOFT_TUNE_FAILED = '软调参数生成失败，请稍后重试';
export const SOFT_TUNE_TRUNCATED = '软调输出被截断，请重试生成';
export const TRIAL_WRITE_FAILED = '试写失败，请稍后重试';
export const TRIAL_WRITE_TRUNCATED = '试写输出被截断，请重试生成';
export const MISSING_STYLE = '请先选择文风';
export const MISSING_TOPIC_CONTENT = '请先填写主题内容';

/**
 * 软调输出上限。思考模型会把 reasoning 与正文计入同一预算；
 * 过小易在 JSON 写完前被 length 截断。
 */
export const STYLE_TUNING_SOFT_TUNE_MAX_OUTPUT_TOKENS = 8192;

/**
 * 试写输出上限。成稿更长，且思考模型把 reasoning 与正文计入同一预算。
 * 原现象：8192 时 finishReason=length，SSE 报「试写输出被截断」。
 */
export const STYLE_TUNING_TRIAL_WRITE_MAX_OUTPUT_TOKENS = 32768;
