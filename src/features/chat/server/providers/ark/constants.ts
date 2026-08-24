/**
 * 方舟 Responses 与 OpenAI SDK 默认行为不完全兼容，多轮时需注意：
 * 1. 回放历史时方舟要求显式 type/status；SDK 常省略 → MissingParameter input.type / input.status
 * 2. store 默认 true 会发 item_reference，方舟易报 input ... <nil> → 使用 store: false
 * 3. 历史 reasoning + itemId 与方舟不兼容 → pruneMessages 去掉 reasoning；前端 Think 仍可展示本轮流式思考
 * 4. @ai-sdk/openai 遇 web_search 会自动加 include: web_search_call.action.sources（OpenAI 专有）；
 *    方舟报 unknown type → 出站前剥离不支持的 include（同类还有 reasoning.encrypted_content）
 * 5. 方舟引用多在 message.annotations，不发 annotation.added；SDK 流式只认后者 → fetch SSE 注入/补全
 */

/** 方舟 Responses 不认的 OpenAI include 值（Cherry Studio #13144 等同款坑） */
export const ARK_UNSUPPORTED_INCLUDES = new Set([
  'web_search_call.action.sources',
  'reasoning.encrypted_content',
]);
