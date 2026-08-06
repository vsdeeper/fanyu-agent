/**
 * DeepSeek Responses 与 OpenAI SDK 默认行为不完全兼容：
 * 1. @ai-sdk/openai 遇 web_search 会自动加 include: web_search_call.action.sources（OpenAI 专有）→ 出站剥离
 * 2. store:false + forceReasoning:true 时 SDK 自动加 include: reasoning.encrypted_content（OpenAI 专有）→ 出站剥离
 * 3. deepseek-v4-flash 不在 SDK 能力清单内，须 forceReasoning 才会下发 reasoning 块；同时把
 *    systemMessageMode 钉死为 system，避免推理模型默认改用 developer role 不被 DeepSeek 接受
 */

/** DeepSeek Responses 不认的 OpenAI include 值（与方舟同款坑） */
export const DEEPSEEK_UNSUPPORTED_INCLUDES = new Set([
  'web_search_call.action.sources',
  'reasoning.encrypted_content',
]);

/** deepseek-v4-flash 实际 effort 映射：low→low, high→high, xhigh→high, max→max */
export const DEFAULT_DEEPSEEK_REASONING_EFFORT = 'high';

/** 与 @ai-sdk/openai reasoningEffort 枚举保持一致，防手滑传非法值 */
const DEEPSEEK_REASONING_EFFORT_VALUES = new Set([
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]);

/** 读取 DEEPSEEK_REASONING_EFFORT（可选，默认 high）；非法值回退默认 */
export function getDeepseekReasoningEffort():
  'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
  const raw = process.env.DEEPSEEK_REASONING_EFFORT?.trim();
  if (!raw) return DEFAULT_DEEPSEEK_REASONING_EFFORT;
  if (DEEPSEEK_REASONING_EFFORT_VALUES.has(raw))
    return raw as ReturnType<typeof getDeepseekReasoningEffort>;
  console.warn(
    `[deepseek] DEEPSEEK_REASONING_EFFORT="${raw}" 非法，回退 ${DEFAULT_DEEPSEEK_REASONING_EFFORT}`,
  );
  return DEFAULT_DEEPSEEK_REASONING_EFFORT;
}
