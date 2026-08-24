import { tool } from 'ai';
import { z } from 'zod';

import { assetToDataUrl, getAsset, getWorkingAsset } from '@/features/images/server/assets';
import {
  analyzeImage as runAnalyzeImage,
  formatVisionAnalysisText,
  type VisionAnalysis,
} from '@/features/images/server/vision';
import type { AgentToolDefinition } from '@/lib/tools/types';

/**
 * analyze_image 工具：调火山方舟视觉模型分析图片（结构化中文描述回喂主模型）。
 * 图片来源优先级与 generate_image 一致：本轮粘贴/上传附件图 → 显式 assetId → 会话工作图。
 */

export type AnalyzeImageToolResult =
  { ok: true; assetId?: string; analysis: VisionAnalysis } | { ok: false; error: string };

/** 识图工具使用规则（始终拼入 baseInstructions） */
function getAnalyzeImageHint(): string {
  return `识图工具使用规则：
- 主模型无法直接看见图片。需要画面信息时必须调用 analyze_image，不要猜测画面内容
- 本轮消息含图片附件时：调用 analyze_image 服务端自动使用该附件，无需传 assetId
- 分析刚生成的图：尽量传 assetId（上一轮 generate_image 返回结果中已有 assetId）；未传则服务端使用会话工作图
- 用户要求改图或按参考图生图（复刻风格、改画面文字、提取局部、指定元素）时：先调用 analyze_image，再根据分析结果调用 generate_image；不要跳过识图直接改图
- 无参考图的纯文生图：直接 generate_image，不要调用 analyze_image
- 本轮对话历史中已有对该图的 analyze_image 结果时可直接改图或作答，不必重复识图
- 用户仅询问图片内容（这是什么/图里有什么/描述图片/识别图中文字）时：只调用 analyze_image，不要生图
- 用户说「分析上面那张/第二张」但无法对应 assetId、且用户未贴图时：不要猜测、不要调用，请用户把图片复制粘贴到对话框后再试
- analyze_image 仅分析最新一条用户消息的第一张图；分析完成后用自然语言回复或据此写生图 prompt，勿原样复述 JSON`;
}

const PASTE_IMAGE_ANALYZE_HINT =
  '本轮消息含图片附件。主模型看不见该图：先调用 analyze_image（服务端自动使用该附件），再按用户意图回答或调用 generate_image。';

/** 创建 analyze_image：解析源图并回喂结构化中文描述。 */
function createAnalyzeImageTool(chatId: string, pastedImageDataUrl?: string) {
  return tool({
    description:
      '分析图片内容，供主模型理解画面。用户询问图片、或改图/按参考图生图需要画面信息时先调用；无参考图的纯文生图勿用。',
    inputSchema: z.object({
      assetId: z
        .string()
        .optional()
        .describe('要分析的图片 assetId；本轮有粘贴附件时忽略；省略则用会话工作图'),
      question: z.string().optional().describe('针对图片的具体问题；省略时输出通用描述'),
    }),
    execute: async ({ assetId, question }, { abortSignal }): Promise<AnalyzeImageToolResult> => {
      try {
        let dataUrl: string | undefined;
        let resolvedAssetId: string | undefined;

        if (pastedImageDataUrl) {
          dataUrl = pastedImageDataUrl;
        } else if (assetId) {
          const asset = getAsset(assetId);
          if (!asset || asset.chatId !== chatId) {
            return { ok: false, error: '图片不存在或不属于当前会话' };
          }
          resolvedAssetId = asset.id;
          dataUrl = assetToDataUrl(asset);
        } else {
          const working = await getWorkingAsset(chatId);
          if (!working) {
            return { ok: false, error: '没有可分析的图片，请先将图片复制粘贴到对话框' };
          }
          resolvedAssetId = working.id;
          dataUrl = assetToDataUrl(working);
        }

        const result = await runAnalyzeImage(dataUrl, question, abortSignal);
        if (!result.ok) {
          return { ok: false, error: result.error };
        }
        return { ok: true, assetId: resolvedAssetId, analysis: result.analysis };
      } catch (err) {
        console.error('[analyze_image]', err);
        return { ok: false, error: '识图服务暂不可用，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `图片分析失败：${output.error}` };
      }
      return { type: 'text', value: formatVisionAnalysisText(output.analysis, output.assetId) };
    },
  });
}

export const analyzeImage: AgentToolDefinition = {
  id: 'analyze_image',
  create: ({ chatId, pastedImageDataUrl }) => createAnalyzeImageTool(chatId, pastedImageDataUrl),
  getHint: getAnalyzeImageHint,
  getPasteHint: () => PASTE_IMAGE_ANALYZE_HINT,
};
