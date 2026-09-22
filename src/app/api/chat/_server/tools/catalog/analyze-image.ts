import { generateText, tool } from 'ai';
import { z } from 'zod';

import { getTitleReasoningEffort } from '@/app/api/chat/_server/providers/config';
import { resolveChatProviderByModelId } from '@/app/api/chat/_server/providers/resolve-by-model-id';
import { getChatProviderRuntimeFor } from '@/app/api/chat/_server/providers/resolve';
import { parseImageDataUrlToFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import { resolveImageRefs } from '../resolve-image-refs';
import { getConfiguredAnalyzeImageModelId } from '../analyze-image-config';
import type { AgentToolDefinition } from '../types';

export { getConfiguredAnalyzeImageModelId } from '../analyze-image-config';

const INTERRUPTED_ERROR = '已中断';
const DEFAULT_QUESTION =
  '请详细描述画面内容（主体、文字、布局、颜色、风格与关键细节），供后续改图使用。';

export type AnalyzeImageSuccess = {
  ok: true;
  analysis: string;
};

export type AnalyzeImageFailure = {
  ok: false;
  error: string;
};

export type AnalyzeImageResult = AnalyzeImageSuccess | AnalyzeImageFailure;

function getAnalyzeImageHint(): string {
  return `识图工具使用规则：
- 已启用专用识图模型：主模型看不到图片像素。凡改图 / 按图生图 / 描述画面（改文字、布局、颜色、元素、风格复刻等），必须先调用 analyze_image，再根据返回结果调用 generate_image（mode=edit）或其他回复
- 禁止凭猜测或会话记忆编造画面文字与细节；以 analyze_image 返回为准
- 仅当用户明确只要整体调亮/加滤镜等、且声明不依赖画面细节时，可跳过本工具直接 edit
- 给用户的汇总不要出现 assetId、模型 id、图片 URL 等内部标识`;
}

const PASTE_ANALYZE_HINT =
  '本轮用户消息含图片附件，但像素不会送给主模型；请先 analyze_image（默认识别第一张，可传 pastedImageIndexes），再按识图结果改图。';

/** 创建 analyze_image：用配置的识图模型对参考图做高保真视觉分析，结果回喂主模型。 */
function createAnalyzeImageTool(chatId: string, pastedImageDataUrls?: string[]) {
  return tool({
    description:
      '对参考图做详细视觉分析（文字、布局、颜色、元素等）。已启用专用识图时，改图或描述画面必须先调用本工具；也可单独回答「描述这张图」类问题。',
    inputSchema: z.object({
      question: z.string().optional().describe('识图焦点问题；省略则输出供改图使用的完整画面描述'),
      sourceAssetIds: z
        .array(z.string())
        .optional()
        .describe('历史生成图 assetId；省略则以本轮粘贴图或 working image 为准'),
      pastedImageIndexes: z
        .array(z.number().min(0))
        .optional()
        .describe('引用本轮粘贴图的 0 基序号（0=第一张）；省略时只用第一张'),
    }),
    execute: async (
      { question, sourceAssetIds, pastedImageIndexes },
      { abortSignal },
    ): Promise<AnalyzeImageResult> => {
      try {
        if (abortSignal?.aborted) {
          return { ok: false, error: INTERRUPTED_ERROR };
        }

        const modelId = getConfiguredAnalyzeImageModelId();
        if (!modelId) {
          return { ok: false, error: '识图模型未配置，请稍后重试' };
        }

        const provider = resolveChatProviderByModelId(modelId);
        if (!provider) {
          return { ok: false, error: '不支持的识图模型，请检查配置后重试' };
        }

        const resolved = await resolveImageRefs({
          chatId,
          pastedImageDataUrls,
          sourceAssetIds,
          pastedImageIndexes,
        });
        if ('error' in resolved) {
          return { ok: false, error: resolved.error };
        }

        const imageParts: Array<{
          type: 'file';
          data: Buffer;
          mediaType: string;
          providerOptions: { openai: { imageDetail: 'high' } };
        }> = [];
        for (const dataUrl of resolved.dataUrls) {
          const part = parseImageDataUrlToFilePart(dataUrl);
          if (!part) {
            return { ok: false, error: '参考图无法解析，请重新上传后再试' };
          }
          // SDK imageDetail=high → 方舟 request-patch 升为 xhigh + 最大像素上限，尽量保留细节
          imageParts.push({
            ...part,
            providerOptions: { openai: { imageDetail: 'high' } },
          });
        }
        if (imageParts.length === 0) {
          return { ok: false, error: '没有可用的参考图' };
        }

        if (abortSignal?.aborted) {
          return { ok: false, error: INTERRUPTED_ERROR };
        }

        const runtime = getChatProviderRuntimeFor(provider);
        const capabilities = runtime.getCapabilities();
        const openaiOptions = {
          ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
          ...runtime.getOpenAIOptions(),
          reasoningEffort: getTitleReasoningEffort(provider),
        };

        const promptText = (question?.trim() || DEFAULT_QUESTION).trim();
        const result = await generateText({
          model: runtime.getMainModel(modelId),
          instructions:
            '你是视觉分析助手。根据用户问题准确描述图片内容，便于后续改图；使用中文简体，条理清晰，勿编造看不见的细节。',
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: promptText }, ...imageParts],
            },
          ],
          abortSignal,
          providerOptions: { openai: openaiOptions },
        });

        if (abortSignal?.aborted) {
          return { ok: false, error: INTERRUPTED_ERROR };
        }

        const analysis = (result.text || '').trim();
        if (!analysis) {
          return { ok: false, error: '识图未返回有效内容，请稍后重试' };
        }

        return { ok: true, analysis };
      } catch (err) {
        if (abortSignal?.aborted) {
          return { ok: false, error: INTERRUPTED_ERROR };
        }
        console.error('[analyze_image]', err);
        return { ok: false, error: '识图服务暂不可用，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `识图失败：${output.error}` };
      }
      return { type: 'text', value: output.analysis };
    },
  });
}

export const analyzeImage: AgentToolDefinition = {
  id: 'analyze_image',
  requiresConfiguredAnalyzeImageModel: true,
  create: ({ chatId, pastedImageDataUrls }) => createAnalyzeImageTool(chatId, pastedImageDataUrls),
  getHint: getAnalyzeImageHint,
  getPasteHint: () => PASTE_ANALYZE_HINT,
};
