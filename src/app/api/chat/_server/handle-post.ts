import type { UIMessage } from 'ai';

import { parseUserLocation } from '@/app/api/geo/_server/parse-request';
import type { UserLocation } from '@/app/api/geo/_shared/types';
import { loadChat, saveChat } from '@/app/api/chats/_server/store';
import { ApiErrorCode, jsonFail } from '@/lib/shared/server/api-response';
import { resolveTurnSkills } from '@/lib/skills/server/resolve-turn';
import type { ChatPostBody } from './parse-request';
import { parseChatPostBody } from './parse-request';
import { streamChatResponse } from './stream-chat';

type HandleChatPostOptions = {
  body: ChatPostBody;
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
};

async function handleSubmitMessage({ body, userLocation, abortSignal }: HandleChatPostOptions) {
  const { id, message } = body;

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

  const previousMeta =
    typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {};
  const { mergedSkillIds } = resolveTurnSkills([...previousMessages, message]);
  const nextMessage: UIMessage = {
    ...message,
    metadata: { ...previousMeta, skillIds: mergedSkillIds },
  };
  const messages = [...previousMessages, nextMessage];

  // 修复：流式前先落盘用户消息，侧栏 refresh 即可见新会话与标题
  await saveChat({ chatId: id, messages });

  return streamChatResponse({
    chatId: id,
    messages,
    userLocation,
    abortSignal,
  });
}

/** POST /api/chat 入口：解析请求体并发起流式对话 */
export async function handleChatApiPost(req: Request): Promise<Response> {
  const body = await parseChatPostBody(req);

  if (!body.id || typeof body.id !== 'string') {
    return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
  }

  const userLocation = parseUserLocation(body.userLocation);

  return handleSubmitMessage({
    body,
    userLocation,
    abortSignal: req.signal,
  });
}
