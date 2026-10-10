/**
 * DeepSeek Responses 与 OpenAI SDK 默认行为不完全兼容：
 * 1. @ai-sdk/openai 遇 web_search 会自动加 include: web_search_call.action.sources（OpenAI 专有）→ 出站剥离
 * 2. store:false + forceReasoning:true 时 SDK 自动加 include: reasoning.encrypted_content（OpenAI 专有）→ 出站剥离
 * 3. deepseek-v4-flash 不在 SDK 能力清单内，须 forceReasoning 才会下发 reasoning 块；同时把
 *    systemMessageMode 钉死为 system，避免推理模型默认改用 developer role 不被 DeepSeek 接受
 * 4. 识图细节档：出站统一钉 detail=original（SDK 默认可省略 → 官方 auto；analyze_image 可能带 high）
 * 5. Responses API 思考参数是 reasoning.effort = none|low|high|max（none 关思考）。
 *    SDK 把 reasoningEffort 原样写入 effort，设置侧不能放 minimal / medium / xhigh
 */

import {
  DEEPSEEK_REASONING_EFFORTS,
  DEFAULT_DEEPSEEK_REASONING_EFFORT,
  type DeepseekReasoningEffort,
} from '@/app/api/chat/_shared/chat-settings';
import { getChatSettings } from '@/app/api/chat/_server/request-settings';

/** DeepSeek Responses 不认的 OpenAI include 值（与方舟同款坑） */
export const DEEPSEEK_UNSUPPORTED_INCLUDES = new Set([
  // 修复：include 参数 DeepSeek 不支持（文档标注），SDK 自动加的 web_search_call.action.sources 须剥离
  'web_search_call.action.sources',
  'reasoning.encrypted_content',
]);

/** DeepSeek 识图 detail：保留原图档（官方 low/high/original/auto；auto 当前等价 original） */
export const DEEPSEEK_IMAGE_DETAIL = 'original';

/** 读取思考强度：须有 ALS settings；缺省或非 none/low/high/max 时用 high */
export function getDeepseekReasoningEffort(): DeepseekReasoningEffort {
  const settings = getChatSettings();
  if (!settings) {
    throw new Error('缺少对话设置，无法解析思考强度');
  }
  const fromSettings = settings.reasoningEffort?.trim();
  if (fromSettings && (DEEPSEEK_REASONING_EFFORTS as readonly string[]).includes(fromSettings)) {
    return fromSettings as DeepseekReasoningEffort;
  }
  return DEFAULT_DEEPSEEK_REASONING_EFFORT;
}
