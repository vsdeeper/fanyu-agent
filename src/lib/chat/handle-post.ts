import type { UIMessage } from 'ai';

import { parseUserLocation } from '@/lib/geo/parse-request';
import type { UserLocation } from '@/lib/geo/types';
import { loadChat, saveChat } from '@/lib/chat/store';
import { ApiErrorCode, jsonFail } from '@/lib/shared/api-response';
import type { ChatPostBody } from './parse-request';
import { parseChatPostBody } from './parse-request';
import { streamChatResponse } from './stream-chat';

type HandleChatPostOptions = {
  body: ChatPostBody;
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
};

async function handleContinueMessage({ body, userLocation, abortSignal }: HandleChatPostOptions) {
  const { id, messageId, webSearch = true } = body;

  if (!messageId || typeof messageId !== 'string') {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
  }

  let messages: UIMessage[];

  try {
    messages = (await loadChat(id)).messages;
  } catch {
    return jsonFail(ApiErrorCode.CHAT_NOT_FOUND, '会话不存在', 404);
  }

  const lastMessage = messages.at(-1);

  if (!lastMessage || lastMessage.role !== 'assistant' || lastMessage.id !== messageId) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '无法继续生成该回复', 400);
  }

  return streamChatResponse({
    chatId: id,
    messages,
    webSearch,
    userLocation,
    abortSignal,
    sendStart: false,
  });
}

async function handleSubmitMessage({ body, userLocation, abortSignal }: HandleChatPostOptions) {
  const { id, message, webSearch = true } = body;

  if (!message) {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
  }

  // 修复：/chat 草稿首条磁盘无记录，勿 404；历史从磁盘拼，勿信任客户端整包 messages
  let previousMessages: UIMessage[] = [];

  try {
    previousMessages = (await loadChat(id)).messages;
  } catch {
    /* 新草稿 */
  }

  const messages = [...previousMessages, message];

  // 修复：流式前先落盘用户消息，侧栏 refresh 即可见新会话与标题
  await saveChat({ chatId: id, messages });

  return streamChatResponse({
    chatId: id,
    messages,
    webSearch,
    userLocation,
    abortSignal,
  });
}

export async function handleChatPost({ body, userLocation, abortSignal }: HandleChatPostOptions) {
  const trigger = body.trigger ?? 'submit-message';

  if (trigger === 'continue-message') {
    return handleContinueMessage({ body, userLocation, abortSignal });
  }

  return handleSubmitMessage({ body, userLocation, abortSignal });
}

/** POST /api/chat 入口：解析请求体并分发 submit / continue */
export async function handleChatApiPost(req: Request): Promise<Response> {
  const body = await parseChatPostBody(req);

  if (!body.id || typeof body.id !== 'string') {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
  }

  const userLocation = parseUserLocation(body.userLocation);

  return handleChatPost({
    body,
    userLocation,
    abortSignal: req.signal,
  });
}
