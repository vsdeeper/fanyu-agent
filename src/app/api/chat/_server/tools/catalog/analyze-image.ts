import { tool } from 'ai';
import { z } from 'zod';

import { assetToDataUrl, getAsset, getWorkingAsset } from '@/app/api/images/_server/assets';
import {
  analyzeImage as runAnalyzeImage,
  formatVisionAnalysisText,
  type VisionAnalysis,
} from '@/app/api/images/_server/vision';
import type { AgentToolDefinition } from '../types';
import { normalizeAnalyzeResults } from './legacy-output';

/**
 * analyze_image 工具：调火山方舟视觉模型分析图片（结构化中文描述回喂主模型）。
 * 支持多张：默认分析本轮全部粘贴图，可用 pastedImageIndexes 指定某几张；历史资产同 generate_image。
 */

export type AnalyzeImageToolResult =
  | {
      ok: true;
      results: Array<{ assetId?: string; index?: number; analysis: VisionAnalysis }>;
      /** 本轮粘贴图总数（供 toModelOutput 标「共 M 张」）；资产/工作图路径为 1；旧落盘形状无此字段。 */
      totalPasted?: number;
      // 旧落盘形状：重构前成功 part 为 { ok:true, analysis, assetId }，无 results 数组。保留可选字段供兼容读取。
      analysis?: VisionAnalysis;
      assetId?: string;
    }
  | { ok: false; error: string };

/** 识图工具使用规则（始终拼入 baseInstructions） */
function getAnalyzeImageHint(): string {
  return `识图工具使用规则：
- 主模型无法直接看见图片。需要画面信息时必须调用 analyze_image，不要猜测画面内容
- 本轮消息含多张图片附件时：调用 analyze_image 会依次分析全部附件（每张分别回述）；只分析其中某几张时传 pastedImageIndexes（0 基）
- 分析刚生成的图：尽量传 assetId（上一轮 generate_image 返回结果中已有 assetId）；未传则服务端使用会话工作图
- 用户要求改图或按参考图生图（复刻风格、改画面文字、提取局部、指定元素、多图合成）时：先调用 analyze_image，再根据分析结果调用 generate_image；不要跳过识图直接改图
- 分析多张时，请在回复中按「第 N 张 / 共 M 张」区分各张内容，据此决定 generate_image 的 sourceAssetIds 或 pastedImageIndexes
- 无参考图的纯文生图：直接 generate_image，不要调用 analyze_image
- 本轮对话历史中已有对该图的分析结果时可直接改图或作答，不必重复识图
- 用户仅询问图片内容（这是什么/图里有什么/描述图片/识别图中文字）时：只调用 analyze_image，不要生图
- 用户说「分析上面那张/第二张」但无法对应 assetId、且用户未贴图时：不要猜测、不要调用，请用户把图片复制粘贴到对话框后再试
- analyze_image 仅分析最新一条用户消息的图片；分析完成后用自然语言回复或据此写生图 prompt，勿原样复述 JSON`;
}

const PASTE_IMAGE_ANALYZE_HINT =
  '本轮消息含图片附件。主模型看不见这些图：先调用 analyze_image（服务端自动分析全部附件，可用 pastedImageIndexes 指定某几张），再按用户意图回答或调用 generate_image。';

/** 解析识图源：返回 dataUrl 数组；失败返回友好错误。粘贴图主路径，其次历史资产。 */
function resolveAnalyzeSources({
  pastedImageDataUrls,
  pastedImageIndexes,
  assetId,
  chatId,
}: {
  pastedImageDataUrls?: string[];
  pastedImageIndexes?: number[];
  assetId?: string;
  chatId: string;
}):
  | { dataUrls: string[]; assetIds: (string | undefined)[]; pasteIndexes: (number | undefined)[] }
  | { error: string } {
  if (pastedImageDataUrls?.length) {
    // 去重 + 升序，避免同一张被重复分析、乱序回喂；index=粘贴序号，供主模型区分各张后复用
    const indexes = (
      pastedImageIndexes?.length
        ? [...new Set(pastedImageIndexes)]
        : pastedImageDataUrls.map((_, i) => i)
    ).sort((a, b) => a - b);
    const dataUrls: string[] = [];
    for (const index of indexes) {
      const dataUrl = pastedImageDataUrls[index];
      if (!dataUrl) {
        return { error: `粘贴图第 ${index + 1} 张不存在` };
      }
      dataUrls.push(dataUrl);
    }
    return { dataUrls, assetIds: dataUrls.map(() => undefined), pasteIndexes: indexes };
  }

  if (assetId) {
    const asset = getAsset(assetId);
    if (!asset || asset.chatId !== chatId) {
      return { error: '图片不存在或不属于当前会话' };
    }
    return { dataUrls: [assetToDataUrl(asset)], assetIds: [asset.id], pasteIndexes: [undefined] };
  }

  // 无明确源：交由 execute 用会话工作图兜底
  return { dataUrls: [], assetIds: [], pasteIndexes: [] };
}

/** 创建 analyze_image：解析源图并回喂结构化中文描述（多张时逐张分析）。 */
function createAnalyzeImageTool(chatId: string, pastedImageDataUrls?: string[]) {
  return tool({
    description:
      '分析图片内容，供主模型理解画面。用户询问图片、或改图/按参考图生图需要画面信息时先调用；无参考图的纯文生图勿用。',
    inputSchema: z.object({
      assetId: z
        .string()
        .optional()
        .describe('要分析的图片 assetId；本轮有粘贴附件时忽略；省略则用会话工作图'),
      pastedImageIndexes: z
        .array(z.number().min(0))
        .optional()
        .describe('引用本轮粘贴图的 0 基序号（0=第一张）；省略且本轮有粘贴图时分析全部'),
      question: z.string().optional().describe('针对图片的具体问题；省略时输出通用描述'),
    }),
    execute: async (
      { assetId, pastedImageIndexes, question },
      { abortSignal },
    ): Promise<AnalyzeImageToolResult> => {
      try {
        const sources = resolveAnalyzeSources({
          pastedImageDataUrls,
          pastedImageIndexes,
          assetId,
          chatId,
        });
        if ('error' in sources) {
          return { ok: false, error: sources.error };
        }

        // 无明确源：缺省用会话工作图
        let dataUrls = sources.dataUrls;
        let assetIds = sources.assetIds;
        let pasteIndexes = sources.pasteIndexes;
        if (dataUrls.length === 0) {
          const working = await getWorkingAsset(chatId);
          if (!working) {
            return { ok: false, error: '没有可分析的图片，请先将图片复制粘贴到对话框' };
          }
          dataUrls = [assetToDataUrl(working)];
          assetIds = [working.id];
          pasteIndexes = [undefined];
        }

        // totalPasted：本轮粘贴图总数（粘贴路径）；资产/工作图兜底为 1，供 toModelOutput 标「共 M 张」。
        const totalPasted = pastedImageDataUrls?.length ? pastedImageDataUrls.length : 1;
        // index = 实际粘贴序号（0 基），供主模型据此定位第几张后复用到 generate_image 的 pastedImageIndexes
        const results: Array<{ assetId?: string; index?: number; analysis: VisionAnalysis }> = [];
        for (let i = 0; i < dataUrls.length; i++) {
          const result = await runAnalyzeImage(dataUrls[i], question, abortSignal);
          if (!result.ok) {
            return { ok: false, error: result.error };
          }
          results.push({
            assetId: assetIds[i],
            index: pasteIndexes[i],
            analysis: result.analysis,
          });
        }
        return { ok: true, results, totalPasted };
      } catch (err) {
        console.error('[analyze_image]', err);
        return { ok: false, error: '识图服务暂不可用，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `图片分析失败：${output.error}` };
      }
      const results = normalizeAnalyzeResults(output);
      // 共 M 张：优先用本轮粘贴图总数（粘贴路径 output.totalPasted）；否则退回「已分析张数」。
      // 修复：子集选图时不要把「第 N 张」（粘贴序号）和「共 M 张」（分析子集长度）混用成自相矛盾的计数。
      const hasIndex = results.some((r) => r.index != null);
      const total = hasIndex
        ? (output.totalPasted ?? Math.max(...results.map((r) => (r.index ?? 0) + 1)))
        : results.length;
      const blocks = results.map((item, i) => {
        // 多张时用实际粘贴序号标注（item.index），历史/工作图路径 index 为 undefined 退回循环位置；
        // 避免按循环位置误标，粘贴图选了子集时（如 [2,0]）主模型据此才能对回正确序号。
        const nth = (item.index ?? i) + 1;
        const label = total > 1 ? `第 ${nth} 张 / 共 ${total} 张` : '图片';
        const text = formatVisionAnalysisText(item.analysis, item.assetId);
        return total > 1 ? `【${label}】\n${text}` : text;
      });
      const combined = blocks.join('\n\n');
      const tail =
        total > 1
          ? '\n\n若用户要求改图或合成，请基于以上各张内容，用 generate_image 的 sourceAssetIds 或 pastedImageIndexes 指定所用参考图，并按其顺序在 prompt 中说明各图用途；勿原样复述本清单。'
          : '';
      return { type: 'text', value: `${combined}${tail}` };
    },
  });
}

export const analyzeImage: AgentToolDefinition = {
  id: 'analyze_image',
  // 仅盲主模型链路启用：自带视觉的 Provider（zhipu glm）直读像素，识图工具与其提示词整体多余
  requiresBlindMainModel: true,
  create: ({ chatId, pastedImageDataUrls }) => createAnalyzeImageTool(chatId, pastedImageDataUrls),
  getHint: getAnalyzeImageHint,
  getPasteHint: () => PASTE_IMAGE_ANALYZE_HINT,
};
