import { tool } from 'ai';
import { z } from 'zod';

import {
  assetToDataUrl,
  buildImageAssetUrl,
  getAsset,
  getWorkingAsset,
  resolveParentModelId,
  saveImageAsset,
} from '@/features/images/server/assets';
import { getCurrentImageModelId, getImageModelProfile } from '@/features/images/registry';
import { generateImageViaRouter, resolveImageModelId } from '@/features/images/server/router';
import {
  describeImageSize,
  getImageSpec,
  IMAGE_ASPECT_RATIO_AUTO,
  IMAGE_ASPECT_RATIOS,
  isValidImageSize,
} from '@/features/images/image-spec';
import { IMAGE_TOOL_INTERRUPTED_ERROR, IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/lib/tools/constants';
import type { AgentToolDefinition } from '@/lib/tools/types';

const SIZE_FORMAT_PATTERN = /^\d+(?:\.\d+)?K$|^\d+x\d+$/i;
const ASPECT_RATIO_PATTERN = /^(auto|\d+:\d+)$/i;

export type ImageToolSuccess = {
  ok: true;
  assetId: string;
  url: string;
  modelId: string;
  parentId: string | null;
};

export type ImageToolFailure = {
  ok: false;
  error: string;
};

export type ImageToolResult = ImageToolSuccess | ImageToolFailure;

/**
 * 按当前生图模型的尺寸规格生成工具使用规则。
 */
function getImageSystemHint(): string {
  const spec = getImageSpec(getCurrentImageModelId());
  const presets = spec.presets.join('/');
  const sizeLine =
    spec.minPixels != null && spec.maxPixels != null
      ? `- 生图尺寸只传 ${presets}，或总像素 ${spec.minPixels} ~ ${spec.maxPixels} 的 WIDTHxHEIGHT（默认 ${spec.defaultSize}）；档位随模型而异，编辑历史图时以该图模型为准`
      : `- 生图尺寸只传 ${presets}（默认 ${spec.defaultSize}）；档位随模型而异，编辑历史图时以该图模型为准`;
  return `生图工具使用规则：
- 用户明确要求生成/绘制/出图时调用 generate_image，mode=generate
- 用户要求修改图片时调用 generate_image，mode=edit
- 仅讨论如何画、不请求出图时不要调用
- 有源图且改图/按图生图指令依赖画面内容（复刻风格、改文字、提取局部、指定元素）时：先调用 analyze_image，再按分析结果调用本工具
- 用户本轮消息含图片附件并要求修改时：mode=edit，服务端优先使用该附件作源图，无需传 sourceAssetIds
- 改刚生成的图：mode=edit，尽量传 sourceAssetIds（上一轮 tool 结果已含 assetId）；未传则服务端使用 working image
- 用户说「改上面那张 / 第二张」且无法对应到已知 assetId、用户也未贴图时：不要猜测、不要调用 edit，请用户将要修改的图复制粘贴到对话框后再试
- 生图成功后界面会自动展示图片；汇总回复时只用文字说明，勿在正文中插入 Markdown 图片或 URL
- 用户明确要求透明背景、去底、抠图或 PNG alpha 时：transparent=true；未要求时不要传 true
- 用户指定画面比例时传 aspectRatio（如 3:2、16:9）；不传或传 auto 时交由模型自选
${sizeLine}`;
}

const PASTE_IMAGE_EDIT_HINT =
  '本轮用户消息含图片附件，edit 将使用该附件作为源图；若改图依赖画面内容，先 analyze_image 再调用本工具。';

/** 创建 generate_image：出图或改图，成功后落盘为会话图片资产。 */
function createGenerateImageTool(chatId: string, pastedImageDataUrl?: string) {
  return tool({
    description:
      '根据描述生成或编辑图片。仅在用户明确要求出图或改图时调用；讨论绘画技巧时不要调用。',
    inputSchema: z.object({
      mode: z.enum(['generate', 'edit']).describe('generate=新图；edit=基于已有图修改'),
      prompt: z.string().min(1).describe('详细生图或改图描述'),
      model: z.string().optional().describe('可选模型 ID；省略则使用当前生图模型'),
      sourceAssetIds: z
        .array(z.string())
        .optional()
        .describe('edit 时源图 assetId；可省略以使用 working image'),
      size: z
        .string()
        .regex(SIZE_FORMAT_PATTERN, '尺寸须为档位（如 2K、4K）或宽x高像素（如 2048x2048）')
        .optional()
        .describe(
          `${describeImageSize(getImageSpec(getCurrentImageModelId()))}；编辑历史图时档位以该图模型为准`,
        ),
      aspectRatio: z
        .string()
        .regex(ASPECT_RATIO_PATTERN, '宽高比须为 auto 或 WIDTH:HEIGHT（如 3:2、16:9）')
        .optional()
        .describe(
          `生图宽高比；${IMAGE_ASPECT_RATIO_AUTO}（默认）或不传为模型自选，支持 ${IMAGE_ASPECT_RATIOS.join('、')} 等`,
        ),
      transparent: z
        .boolean()
        .optional()
        .describe('仅当用户明确要求透明背景、去底、抠图或 PNG alpha 时为 true'),
    }),
    execute: async (
      { mode, prompt, model, sourceAssetIds, size, aspectRatio, transparent },
      { abortSignal },
    ): Promise<ImageToolResult> => {
      try {
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }

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

        const spec = getImageSpec(modelId);
        const resolvedSize =
          size && isValidImageSize(size, spec) ? size.trim() : size ? spec.defaultSize : undefined;
        if (size && resolvedSize !== size.trim()) {
          console.warn(`[generate_image] size 已按模型规格回退: "${size}" -> "${resolvedSize}"`);
        }

        // 大小写不敏感归一 'auto' -> undefined，避免把 'Auto' 当比例串传上游
        const normalizedAspectRatio =
          aspectRatio?.toLowerCase() === IMAGE_ASPECT_RATIO_AUTO ? undefined : aspectRatio;

        const profile = getImageModelProfile(modelId);
        console.info(
          `[generate_image] model=${modelId} provider=${profile?.provider ?? '未知'} label=${profile?.label ?? '?'} mode=${mode} size=${resolvedSize ?? '默认'} aspectRatio=${normalizedAspectRatio ?? IMAGE_ASPECT_RATIO_AUTO}`,
        );

        const result = await generateImageViaRouter({
          modelId,
          prompt,
          mode,
          referenceImageDataUrls,
          size: resolvedSize,
          aspectRatio: normalizedAspectRatio,
          transparent,
        });

        // 请求已中断则不落盘，避免无消息引用的孤儿图
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }

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
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }
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

export const generateImage: AgentToolDefinition = {
  id: 'generate_image',
  create: ({ chatId, pastedImageDataUrl }) => createGenerateImageTool(chatId, pastedImageDataUrl),
  getHint: getImageSystemHint,
  getPasteHint: () => PASTE_IMAGE_EDIT_HINT,
};
