export type GeminiInlineData = { mime_type?: string; mimeType?: string; data?: string };

export type GeminiResponsePart = {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

export type GeminiGenerateResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: GeminiResponsePart[] };
  }>;
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
  error?: { message?: string; status?: string; code?: number };
};

/**
 * 按文件头识别 Gemini 图片 MIME；仅供响应解析测试友好的纯工具使用。
 */
function sniffGeminiImageMime(bytes: Uint8Array, fallback = 'image/jpeg'): string {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return fallback;
}

/** 从 generateContent 响应取最终图：高分辨率请求可能先回预览图，最终图片位于更靠后的图片 part。 */
export function extractGeminiImage(
  payload: GeminiGenerateResponse,
): { bytes: Uint8Array; mimeType: string } | undefined {
  let selected: { bytes: Uint8Array; mimeType: string } | undefined;
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data;
      if (!inline?.data) continue;
      const bytes = new Uint8Array(Buffer.from(inline.data, 'base64'));
      selected = {
        bytes,
        mimeType: inline.mimeType ?? inline.mime_type ?? sniffGeminiImageMime(bytes),
      };
    }
  }
  return selected;
}
