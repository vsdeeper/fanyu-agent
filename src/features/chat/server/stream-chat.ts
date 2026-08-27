import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  pruneMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

import type { UserLocation } from '@/features/geo/types';
import {
  finalizeIncompleteToolParts,
  markLastAssistantStopped,
  sanitizeFilePartsForModel,
} from '@/features/chat/server/sanitize-messages';
import { generateChatTitle } from '@/features/chat/server/generate-title';
import { saveChat, updateChatTitle } from '@/features/chat/server/store';
import { selectModel } from '@/features/chat/server/select-model';
import { getFirstUserText } from '@/features/chat/title';
import { getLatestUserImageDataUrl } from '@/lib/tools/server/pasted-image';
import { createCatalogTools, getToolHints } from '@/lib/tools/server/registry';
import { buildSkillCatalogPrompt } from '@/lib/skills/server/catalog-prompt';
import { expandSkillTokensInText } from '@/lib/skills/server/expand';
import { listSkills } from '@/lib/skills/server/registry';
import { resolveTurnSkills } from '@/lib/skills/server/resolve-turn';
import { getChatProvider } from './providers/config';
import { getChatProviderRuntime } from './providers/resolve';
import { createLocalWebSearchSourceBridge } from './web-search-source-bridge';

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

export type StreamChatOptions = {
  chatId: string;
  messages: UIMessage[];
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
};

export async function streamChatResponse({
  chatId,
  messages,
  userLocation,
  abortSignal,
}: StreamChatOptions) {
  const isFirstUserTurn = messages.filter((message) => message.role === 'user').length === 1;
  const firstUserText = isFirstUserTurn ? getFirstUserText(messages) : '';
  // 与主对话并行摘要；不绑 abortSignal，停止生成仍应留下标题
  const titlePromise = firstUserText
    ? generateChatTitle(firstUserText).then(async (llmTitle) => {
        if (llmTitle) {
          await updateChatTitle(chatId, llmTitle);
        }
        return llmTitle;
      })
    : Promise.resolve(undefined);

  const runtime = getChatProviderRuntime();
  const provider = getChatProvider();
  const { modelId, tier } = await selectModel(messages, provider);
  // 模型档位只在服务端打印供排查，不注入流展示给用户
  console.info('[chat] select-model', { chatId, modelId, tier });
  const client = runtime.getClient();
  const capabilities = runtime.getCapabilities();

  const pastedImageDataUrl = getLatestUserImageDataUrl(messages);

  // 联网搜索构造权在 Provider：usesSdkWebSearchTool=true（deepseek/ark）注册 SDK 原生
  // server tool；否则（zhipu）由本地 web_search 工具经独立 API 显式检索
  const catalogTools = createCatalogTools({
    chatId,
    pastedImageDataUrl,
    mainModelAcceptsImage: capabilities.acceptsImageInput,
    providerHasNativeWebSearch: capabilities.usesSdkWebSearchTool,
  });
  const tools = {
    ...catalogTools,
    ...(capabilities.usesSdkWebSearchTool
      ? { web_search: client.tools.webSearch(runtime.getWebSearchArgs(userLocation)) }
      : {}),
  };

  // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think
  // 修复：stop 在 tool 阶段中断时末条仅有 tool-call 无 result，须 ignoreIncompleteToolCalls
  // 修复：text/* 与 .docx 附件在转模型入参前解码为 text part，否则方舟 Responses 对非
  // application/pdf 内联文件抛 UnsupportedFunctionalityError（AI SDK 转换阶段硬抛，fetch 拦不到）
  const convertedMessages = await convertToModelMessages(
    await sanitizeFilePartsForModel(messages, {
      acceptsImageInput: capabilities.acceptsImageInput,
    }),
    {
      tools,
      ignoreIncompleteToolCalls: true,
    },
  );
  const modelMessages = pruneMessages({
    messages: convertedMessages,
    reasoning: 'all',
  });

  const { turnActivatedSkills } = resolveTurnSkills(messages, { log: false });
  const activatedIds = new Set(turnActivatedSkills.map((skill) => skill.id));
  const allSkillIds = new Set(listSkills().map((skill) => skill.id));

  // skill 令牌：历史消息一律短引用，避免把过期 instructions 再塞进上下文；
  // 本轮已 Activation 的 id 同样短引用（正文只出现在 instructions 块）。
  let lastUserIndex = -1;
  for (let i = modelMessages.length - 1; i >= 0; i--) {
    if (modelMessages[i]?.role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  const expandedMessages = modelMessages.map((message, index) => {
    if (message.role !== 'user') return message;
    const seenIds = index === lastUserIndex ? new Set(activatedIds) : new Set(allSkillIds);
    const content = message.content;
    if (typeof content === 'string') {
      return { ...message, content: expandSkillTokensInText(content, seenIds) };
    }
    if (Array.isArray(content)) {
      return {
        ...message,
        content: content.map((part) =>
          part.type === 'text'
            ? { ...part, text: expandSkillTokensInText(part.text, seenIds) }
            : part,
        ),
      };
    }
    return message;
  });

  const stoppedTaskHint = [
    '对话规则：',
    '- 只回答用户最新一条消息所问的问题',
    '- 历史中若存在用户已停止的未完成助手回复，视为该轮任务已取消',
    '- 不要续写、补答或总结那些已停止的任务，也不要在回复末尾询问是否继续执行旧任务',
  ].join('\n');

  const catalogPrompt = buildSkillCatalogPrompt();
  const activationBlock = turnActivatedSkills.length
    ? `\n\n【本轮激活 Skills：${turnActivatedSkills
        .map((skill) => skill.name)
        .join('、')}】\n${turnActivatedSkills.map((skill) => skill.instructions).join('\n\n')}`
    : '';

  // 修复：明确要求思考过程使用中文简体，避免中英文混杂
  const baseInstructions = `使用中文简体与用户对话，思考过程（reasoning/thinking）也必须使用中文简体。\n\n${stoppedTaskHint}\n\n${catalogPrompt}${activationBlock}\n\n${getToolHints(Boolean(pastedImageDataUrl), capabilities.acceptsImageInput, capabilities.usesSdkWebSearchTool)}`;

  const instructions = runtime.getInstructions({
    userLocation,
    baseInstructions,
    convertedMessages,
  });

  const result = streamText({
    model: runtime.getMainModel(modelId),
    instructions,
    messages: expandedMessages,
    tools,
    // 修复：无 stopWhen 时 tool 执行后不会继续汇总；生图+说明需多步
    stopWhen: stepCountIs(5),
    // store:false 仅 Responses 端点链路需要（防 item_reference）；Chat Completions 链路
    // 发 OpenAI 专有字段有 400 风险，由 needsOpenaiStoreFalse 能力位分流，勿恢复统一注入
    providerOptions: {
      openai: {
        ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
        ...runtime.getOpenAIOptions(),
      },
    },
    // 修复：stop 须随客户端 abort 同步中止并落盘半截；勿再用 consumeStream 后台跑完覆盖
    abortSignal,
  });

  // 本地 web_search 工具的结果经桥接转 source part（原生联网链路自带注解产物，勿重复注入）
  const modelStream = capabilities.usesSdkWebSearchTool
    ? result.stream
    : result.stream.pipeThrough(createLocalWebSearchSourceBridge());

  const modelUiStream = toUIMessageStream({
    stream: modelStream,
    sendSources: true,
    originalMessages: messages,
    generateMessageId,
    onEnd: async ({ messages: nextMessages, isAborted }) => {
      let toSave = finalizeIncompleteToolParts(nextMessages);
      if (isAborted) {
        toSave = markLastAssistantStopped(toSave);
      }
      await saveChat({ chatId, messages: toSave });
      await titlePromise;
    },
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        void titlePromise.then((title) => {
          if (!title) return;
          writer.write({
            type: 'data-chat-title',
            data: { title },
            transient: true,
          });
        });
        writer.merge(modelUiStream);
      },
    }),
  });
}
