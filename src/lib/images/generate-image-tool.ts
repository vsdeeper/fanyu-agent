import { isFileUIPart, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import {
  assetToDataUrl,
  buildImageAssetUrl,
  getAsset,
  getWorkingAsset,
  resolveParentModelId,
  saveImageAsset,
} from '@/lib/images/assets';
import { generateImageViaRouter, resolveImageModelId } from './router';
import { ARK_SEEDREAM_SIZE_PRESETS, isValidSeedreamSize } from './size';
import { IMAGE_TOOL_PASTE_SOURCE_ERROR, type ImageToolResult } from './types';

const IMAGE_SYSTEM_HINT = `生图工具使用规则：
- 用户明确要求生成/绘制/出图时调用 generate_image，mode=generate
- 用户要求修改图片时调用 generate_image，mode=edit
- 仅讨论如何画、不请求出图时不要调用
- 用户本轮消息含图片附件并要求修改时：mode=edit，服务端优先使用该附件作源图，无需传 sourceAssetIds
- 改刚生成的图：mode=edit，尽量传 sourceAssetIds（上一轮 tool 结果已含 assetId）；未传则服务端使用 working image
- 用户说「改上面那张 / 第二张」且无法对应到已知 assetId、用户也未贴图时：不要猜测、不要调用 edit，请用户将要修改的图复制粘贴到对话框后再试
- 生图成功后界面会自动展示图片；汇总回复时只用文字说明，勿在正文中插入 Markdown 图片或 URL
- 生图尺寸只传 2K/4K 或满足像素下限的 WxH（如 2048x2048、2560x1440），勿传 1024x1024 等过小尺寸`;

const PASTE_IMAGE_EDIT_HINT = '本轮用户消息含图片附件，edit 将使用该附件作为源图。';

export { IMAGE_SYSTEM_HINT, PASTE_IMAGE_EDIT_HINT };

/**
 * 从消息历史取最新一条 user 消息里第一张 image/* 附件的 data URL（粘贴/上传/拖拽）。
 * 供 generate_image edit 优先作源图；无则返回 undefined。
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

export function createGenerateImageTool(chatId: string, pastedImageDataUrl?: string) {
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
      size: z
        .union([
          z.enum(ARK_SEEDREAM_SIZE_PRESETS),
          z.string().regex(/^\d+x\d+$/i, '自定义尺寸须为 宽x高 像素格式，如 2048x2048'),
        ])
        .optional()
        .refine((v) => v === undefined || isValidSeedreamSize(v), {
          message: '尺寸总像素须在 3,686,400 ~ 16,777,216 之间，或使用 2K/4K；勿使用 1024x1024',
        })
        .describe(
          '可选尺寸：2K（默认）或 4K，或自定义 WIDTHxHEIGHT（如 2048x2048、2560x1440）；勿使用 1024x1024',
        ),
    }),
    execute: async ({ mode, prompt, model, sourceAssetIds, size }): Promise<ImageToolResult> => {
      try {
        let parentId: string | null = null;
        let referenceImageDataUrls: string[] | undefined;

        if (mode === 'edit') {
          if (pastedImageDataUrl) {
            referenceImageDataUrls = [pastedImageDataUrl];
          } else {
            const sourceId = sourceAssetIds?.[0] ?? (await getWorkingAsset(chatId))?.id;
            if (!sourceId) {
              return {
                ok: false,
                error: IMAGE_TOOL_PASTE_SOURCE_ERROR,
              };
            }
            const sourceAsset = getAsset(sourceId);
            if (!sourceAsset || sourceAsset.chatId !== chatId) {
              return { ok: false, error: '参考图不存在或不属于当前会话' };
            }
            parentId = sourceAsset.id;
            referenceImageDataUrls = [assetToDataUrl(sourceAsset)];
          }
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
    // 修复：execute 完整 output 供 UI part 落盘；toModelOutput 不含 url，避免主模型正文重复写 ![]()
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `生图失败：${output.error}` };
      }
      return {
        type: 'text',
        value: `图片已生成，assetId 为 ${output.assetId}。改图时请将该 id 放入 sourceAssetIds。界面会自动展示，请用简短文字向用户说明，不要在正文中插入 Markdown 图片、图片 URL 或 /api/images 链接。`,
      };
    },
  });
}
