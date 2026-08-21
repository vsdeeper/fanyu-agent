import { isFileUIPart, type UIMessage } from 'ai';

/**
 * 从消息历史取最新一条 user 消息里第一张 image/* 附件的 data URL（粘贴/上传/拖拽）。
 * 供 generate_image edit / analyze_image 优先作源图；无则返回 undefined。
 */
export function getLatestUserImageDataUrl(messages: UIMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    if (!message.parts?.length) return undefined;

    for (const part of message.parts) {
      if (
        isFileUIPart(part) &&
        part.mediaType.startsWith('image/') &&
        part.url.startsWith('data:')
      ) {
        return part.url;
      }
    }
    return undefined;
  }
  return undefined;
}
