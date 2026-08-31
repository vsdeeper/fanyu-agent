import 'server-only';

import { isFileUIPart, isToolUIPart, type UIMessage } from 'ai';
import mammoth from 'mammoth';
import { IMAGE_TOOL_INTERRUPTED_ERROR } from '../_shared/tool-errors';

const GENERIC_TOOL_INTERRUPTED_ERROR = '已中断';

/**
 * 把未完成 tool part 收尾为 output-available 失败结果，避免下次 convert 缺 result。
 * 修复：原先直接删除这些 part，刷新后生图像从未调用，且正文已 done 时无「已停止」提示。
 */
export function finalizeIncompleteToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== 'assistant' || !message.parts?.length) {
      return message;
    }

    let finalized = false;
    const parts = message.parts.map((part) => {
      if (
        !isToolUIPart(part) ||
        (part.state !== 'input-streaming' && part.state !== 'input-available')
      ) {
        return part;
      }

      finalized = true;
      return {
        ...part,
        state: 'output-available' as const,
        input: part.input,
        output:
          part.type === 'tool-generate_image'
            ? { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR }
            : { ok: false, error: GENERIC_TOOL_INTERRUPTED_ERROR },
      };
    });

    if (!finalized) {
      return message;
    }

    return withStoppedMetadata({ ...message, parts: parts as UIMessage['parts'] });
  });
}

/**
 * 给末条 assistant 写入 metadata.stopped，供刷新后展示「这条消息已停止」。
 */
export function markLastAssistantStopped(messages: UIMessage[]): UIMessage[] {
  const last = messages.at(-1);
  if (!last || last.role !== 'assistant') {
    return messages;
  }
  const next = withStoppedMetadata(last);
  if (next === last) {
    return messages;
  }
  return [...messages.slice(0, -1), next];
}

function withStoppedMetadata(message: UIMessage): UIMessage {
  const metadata = (message.metadata ?? {}) as Record<string, unknown>;
  if (metadata.stopped === true) {
    return message;
  }
  return { ...message, metadata: { ...metadata, stopped: true } };
}

const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// 修复：mammoth 自带 lib/index.d.ts 未声明 convertToMarkdown（JS 从 v1.4 即有此 API），
// 用局部交叉类型补齐签名，勿在全局声明污染类型空间
type MammothWithMarkdown = typeof mammoth & {
  convertToMarkdown: (
    input: { buffer: Buffer },
    options?: Record<string, unknown>,
  ) => Promise<{ value: string; messages: unknown[] }>;
};

/**
 * 把 data: URL 解码为 Buffer。
 * 前端 FileReader.readAsDataURL 产出 base64 形式（data:<mediatype>;base64,<data>），为主分支；
 * 非 base64 视为 percent-encoding 兜底。
 */
function decodeDataUrl(url: string): Buffer {
  const comma = url.indexOf(',');
  const meta = url.slice(0, comma);
  const data = url.slice(comma + 1);
  return meta.endsWith(';base64')
    ? Buffer.from(data, 'base64')
    : Buffer.from(decodeURIComponent(data), 'utf-8');
}

/**
 * 归一化模型入参里的 file part：text/* 与 .docx 解码为 text part 供模型阅读；
 * image/* 在 acceptsImageInput 时原样保留（多模态主模型直读像素），否则换成短文本占位
 * （盲主模型的像素只走 analyze_image / generate_image）；
 * application/pdf 原样保留；其余不支持类型（.doc 等二进制）从入参剔除。
 *
 * 修复：方舟 Responses 只接受 application/pdf 的内联 file part，text/markdown 等会抛
 * UnsupportedFunctionalityError（AI SDK 在消息→请求体转换阶段硬抛，早于 fetch，request-patch 拦不到）。
 * 转换必须发生在 convertToModelMessages 之前；所有流式对话均经 streamChatResponse 覆盖，
 * 历史消息里的 file part 也会被转换，避免重放报错。
 *
 * 兜底：损坏/不可解析的文件降级为剔除该 part，绝不抛错中断流式；落盘 UIMessage 不变，
 * 聊天气泡仍按原 file part 渲染附件卡片。
 */
export async function sanitizeFilePartsForModel(
  messages: UIMessage[],
  options?: { acceptsImageInput?: boolean },
): Promise<UIMessage[]> {
  const acceptsImageInput = options?.acceptsImageInput === true;
  // pastedImageIndexes 只解析最新一条 user 消息的粘贴图；仅对最新 user 轮的占位符提示该参数，跨轮次索引到错图
  const lastUserIndex = messages.reduce((last, m, i) => (m.role === 'user' ? i : last), -1);
  return Promise.all(
    messages.map(async (message, messageIndex) => {
      if (!message.parts?.length) {
        return message;
      }

      const isLatestUser = message.role === 'user' && messageIndex === lastUserIndex;
      const fileParts = message.parts.filter(
        (p): p is Extract<typeof p, { type: 'file' }> =>
          isFileUIPart(p) && p.url.startsWith('data:'),
      );
      const imageParts = fileParts.filter((p) => p.mediaType.startsWith('image/'));
      const totalImages = imageParts.length;

      let imageIndex = 0;
      const parts = await Promise.all(
        message.parts.map(async (part) => {
          if (!isFileUIPart(part) || !part.url.startsWith('data:')) {
            return part;
          }

          const mediaType = part.mediaType;
          if (mediaType.startsWith('image/')) {
            // acceptsImageInput 的 Provider（zhipu glm 主模型自带视觉）若转占位符，
            // 像素永远不会到达主模型，多模态直读即失效；仅盲主模型链路才降级为 analyze_image 占位
            if (acceptsImageInput) {
              return part;
            }
            const currentIndex = imageIndex++;
            return imageFilePartToPlaceholder(
              part.filename,
              currentIndex,
              totalImages,
              isLatestUser,
            );
          }

          const keepable = mediaType === 'application/pdf';
          const inlinable = mediaType.startsWith('text/') || mediaType === DOCX_MEDIA_TYPE;

          if (!inlinable) {
            return keepable ? part : null;
          }

          try {
            const bytes = decodeDataUrl(part.url);
            const text =
              mediaType === DOCX_MEDIA_TYPE
                ? (
                    await (mammoth as MammothWithMarkdown).convertToMarkdown({
                      buffer: bytes,
                    })
                  ).value
                : bytes.toString('utf-8');
            const filename = part.filename?.trim();
            return filename
              ? { type: 'text' as const, text: `附件「${filename}」：\n${text}` }
              : { type: 'text' as const, text };
          } catch {
            return null; // 损坏/不可解析 → 从模型入参剔除，勿抛错中断流式
          }
        }),
      );

      // 修复：勿用「长度不变即无变化」优化返回原对象 —— file part 转 text part 后数组长度不变，
      // 返回原 message 会丢弃转换结果，text/markdown 附件仍以 file part 进入模型入参，
      // 导致 UnsupportedFunctionalityError（线上验证抓到的实修点）；必须始终返回映射后的新对象
      const cleaned = parts.filter((p) => p !== null) as NonNullable<UIMessage['parts']>;
      return { ...message, parts: cleaned };
    }),
  );
}

/** 主模型入参中的图片占位：保留「有图」信号（含第几张/共几张），不发送像素 */
function imageFilePartToPlaceholder(
  filename: string | undefined,
  index: number,
  total: number,
  isLatestUser: boolean,
): { type: 'text'; text: string } {
  const name = filename?.trim();
  const seq = total > 1 ? `（第 ${index + 1}/${total} 张）` : '';
  const label = name ? `「${name}」` : '';
  // pastedImageIndexes 仅对最新用户轮的粘贴图生效；跨轮/单张不提示，避免主模型索引到错图或误用
  const indexHint = isLatestUser && total > 1 ? '；多张时可用 pastedImageIndexes 指定某几张' : '';
  return {
    type: 'text',
    text: `本轮含图片附件${seq}${label}，请用 analyze_image 查看${indexHint}`,
  };
}
