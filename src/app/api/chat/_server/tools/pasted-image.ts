import { isFileUIPart, type UIMessage } from 'ai';

/**
 * 从消息历史取最新一条 user 消息里的**全部** image/* 附件的 data URL（粘贴/上传/拖拽）。
 * 按附件在原消息里的排列顺序返回，供 generate_image edit / analyze_image 作参考图。
 * 用于让主模型按意图自主选择某几张；无则返回空数组。
 */
export function getLatestUserImageDataUrls(messages: UIMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    if (!message.parts?.length) return [];

    const urls: string[] = [];
    for (const part of message.parts) {
      if (
        isFileUIPart(part) &&
        part.mediaType.startsWith('image/') &&
        part.url.startsWith('data:')
      ) {
        urls.push(part.url);
      }
    }
    return urls;
  }
  return [];
}

/**
 * 从后往前找最近一条「带图片附件」的 user 消息，返回其全部 image data URL。
 * 与 getLatestUserImageDataUrls 的差别：最新用户消息若无图则继续往前找，供用户回答
 * 「哪张是产品图」后仍能登记上一轮粘贴。
 */
export function getMostRecentUserImageDataUrls(messages: UIMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user' || !message.parts?.length) continue;

    const urls: string[] = [];
    for (const part of message.parts) {
      if (
        isFileUIPart(part) &&
        part.mediaType.startsWith('image/') &&
        part.url.startsWith('data:')
      ) {
        urls.push(part.url);
      }
    }
    if (urls.length > 0) return urls;
  }
  return [];
}
