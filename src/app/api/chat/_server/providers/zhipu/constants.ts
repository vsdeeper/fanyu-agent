/**
 * 智谱 BigModel（Chat Completions 兼容端点）与 OpenAI SDK 默认行为的差异备忘：
 * 1. 仅支持 Chat Completions，不支持 Responses API → 主对话经 client.chat(modelId)
 * 2. 思考内容走 delta.reasoning_content，@ai-sdk/openai chat 路径不识别该字段
 *    （chunk schema 静默剥离）→ 入站 SSE 重写为 <think> 标签文本，再由
 *    extractReasoningMiddleware 提取回 reasoning part
 * 3. 内置 web_search 工具（tools 注入形态）在存在任何 function 工具时不触发，而本地
 *    工具常驻注册 → 联网检索不走内置注入，改由本地 web_search 工具调独立 Web Search
 *    API（web-search.ts），来源在 ai 层经 web-search-source-bridge 合成 source part；
 *    服务端无需解析智谱消息附加的搜索结果字段（sse.ts 不做注解合成）
 */
