import { tool } from 'ai';
import { z } from 'zod';
import {
  assetToDataUrl,
  buildImageAssetUrl,
  getAsset,
  getWorkingAsset,
  resolveParentModelId,
  saveImageAsset,
} from '@/lib/image-gen/assets';
import { generateImageViaRouter, resolveImageModelId } from './router';
import type { ImageToolResult } from './types';

const IMAGE_SYSTEM_HINT = `生图工具使用规则：
- 用户明确要求生成/绘制/出图时调用 generate_image，mode=generate
- 用户要求修改刚生成的图（更亮、换背景等）时调用 generate_image，mode=edit
- 仅讨论如何画、不请求出图时不要调用
- edit 时尽量传 sourceAssetIds；未传则服务端使用 working image`;

export { IMAGE_SYSTEM_HINT };

export function createGenerateImageTool(chatId: string) {
  return tool({
    description:
      '根据描述生成或编辑图片。仅在用户明确要求出图或改图时调用；讨论绘画技巧时不要调用。',
    inputSchema: z.object({
      mode: z.enum(['generate', 'edit']).describe('generate=新图；edit=基于已有图修改'),
      prompt: z.string().min(1).describe('详细生图或改图描述'),
      model: z.string().optional().describe('可选模型 ID；默认 Seedream'),
      sourceAssetIds: z
        .array(z.string())
        .optional()
        .describe('edit 时源图 assetId；可省略以使用 working image'),
      size: z.string().optional().describe('可选尺寸，如 2K、1024x1024'),
    }),
    execute: async ({ mode, prompt, model, sourceAssetIds, size }): Promise<ImageToolResult> => {
      try {
        let parentId: string | null = null;
        let referenceImageDataUrls: string[] | undefined;

        if (mode === 'edit') {
          const sourceId = sourceAssetIds?.[0] ?? (await getWorkingAsset(chatId))?.id;
          if (!sourceId) {
            return { ok: false, error: '没有可修改的参考图，请先生成一张图片' };
          }
          const sourceAsset = getAsset(sourceId);
          if (!sourceAsset || sourceAsset.chatId !== chatId) {
            return { ok: false, error: '参考图不存在或不属于当前会话' };
          }
          parentId = sourceAsset.id;
          referenceImageDataUrls = [assetToDataUrl(sourceAsset)];
        }

        const modelId = resolveImageModelId({
          requestedModelId: model,
          parentModelId: parentId ? resolveParentModelId(parentId) : undefined,
        });

        const result = await generateImageViaRouter({
          modelId,
          prompt,
          mode,
          referenceImageDataUrls,
          size,
        });

        const first = result.images[0];
        if (!first) {
          return { ok: false, error: '生图服务未返回图片' };
        }

        const asset = await saveImageAsset({
          chatId,
          parentId,
          modelId,
          prompt,
          bytes: first.bytes,
          mimeType: first.mimeType,
        });

        return {
          ok: true,
          assetId: asset.id,
          url: buildImageAssetUrl(asset.id),
          modelId: asset.modelId,
          parentId: asset.parentId,
        };
      } catch (err) {
        console.error('[generate_image]', err);
        return { ok: false, error: '生图服务暂不可用，请稍后重试' };
      }
    },
  });
}
