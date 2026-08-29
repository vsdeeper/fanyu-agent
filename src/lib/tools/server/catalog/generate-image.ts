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
import { normalizeImageAssets } from './legacy-output';

const SIZE_FORMAT_PATTERN = /^\d+(?:\.\d+)?K$|^\d+x\d+$/i;
const ASPECT_RATIO_PATTERN = /^(auto|\d+:\d+)$/i;

export type ImageToolAsset = {
  assetId: string;
  url: string;
  modelId: string;
  parentId: string | null;
};

export type ImageToolSuccess = {
  ok: true;
  assets: ImageToolAsset[];
  // 旧落盘形状：重构前成功 part 为 { ok:true, assetId, url }，无 assets 数组。保留可选字段供兼容读取。
  assetId?: string;
  url?: string;
};

export type ImageToolFailure = {
  ok: false;
  error: string;
};

export type ImageToolResult = ImageToolSuccess | ImageToolFailure;

/** 解析出的参考图集：data URL 数组 + 每个来源的 parentId（粘贴图为 null，历史资产为其 assetId）。 */
type ResolvedRefs = {
  dataUrls: string[];
  parentIds: (string | null)[];
};

/**
 * 解析 edit 阶段的参考源数组。优先级：显式 pastedImageIndexes → 全部粘贴图 → 历史资产 sourceAssetIds →
 * 会话工作图。越界或资产不属当前会话时返回友好错误。粘贴图无资产实体，parentId 为 null。
 */
async function resolveEditRefs({
  chatId,
  pastedImageDataUrls,
  sourceAssetIds,
  pastedImageIndexes,
}: {
  chatId: string;
  pastedImageDataUrls?: string[];
  sourceAssetIds?: string[];
  pastedImageIndexes?: number[];
}): Promise<ResolvedRefs | { error: string }> {
  const sources: Array<{ dataUrl: string; parentId: string | null }> = [];

  // 粘贴图是主路径：优先于历史资产。默认仅取第一张（与「第一张为默认源」提示一致）；
  // 多参考合成/批量须由模型显式传 pastedImageIndexes，避免省略参数时把多张错误地当作参考合成。
  if (pastedImageDataUrls?.length) {
    const indexes = pastedImageIndexes?.length ? pastedImageIndexes : [0];
    for (const index of indexes) {
      const dataUrl = pastedImageDataUrls[index];
      if (!dataUrl) {
        return { error: `粘贴图第 ${index + 1} 张不存在` };
      }
      sources.push({ dataUrl, parentId: null });
    }
    return {
      dataUrls: sources.map((s) => s.dataUrl),
      parentIds: sources.map((s) => s.parentId),
    };
  }

  // 历史资产路径：sourceAssetIds 缺省退化为工作图
  const sourceIds = sourceAssetIds?.length
    ? sourceAssetIds
    : [(await getWorkingAsset(chatId))?.id].filter((id): id is string => Boolean(id));
  if (sourceIds.length === 0) {
    return { error: IMAGE_TOOL_PASTE_SOURCE_ERROR };
  }
  for (const sourceId of sourceIds) {
    const sourceAsset = getAsset(sourceId);
    if (!sourceAsset || sourceAsset.chatId !== chatId) {
      return { error: '参考图不存在或不属于当前会话' };
    }
    sources.push({ dataUrl: assetToDataUrl(sourceAsset), parentId: sourceAsset.id });
  }
  return {
    dataUrls: sources.map((s) => s.dataUrl),
    parentIds: sources.map((s) => s.parentId),
  };
}

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
- 用户贴了多张图并要求「把这些图一起合成一张」时：strategy=merge（多个参考合并成一张）；要求「把这几张各自都改成 X」时：必传 strategy=batch（每张各出一张新图），漏传会静默合成一张、用户多张请求被缩水
- 只对多张做批改或合成，必传 pastedImageIndexes 指认参考（0 基，0=第一张）；省略时服务端只用第一张，不会自动用全部。多参考按顺序在 prompt 说明图片用途（如「第1张作场景、第2张是主体」）
- 改刚生成的图：mode=edit，尽量传 sourceAssetIds（上一轮 tool 结果已含 assetId）；未传则服务端使用 working image
- 用户说「改上面那张 / 第二张」且无法对应到已知 assetId、用户也未贴图时：不要猜测、不要调用 edit，请用户将要修改的图复制粘贴到对话框后再试
- 生图成功后界面会自动展示图片；汇总回复时只用文字说明，勿在正文中插入 Markdown 图片或 URL
- 用户明确要求透明背景、去底、抠图或 PNG alpha 时：transparent=true；未要求时不要传 true
- 用户指定画面比例时传 aspectRatio（如 3:2、16:9）；不传或传 auto 时交由模型自选
${sizeLine}`;
}

const PASTE_IMAGE_EDIT_HINT =
  '本轮用户消息含图片附件，edit 将使用这些附件作源图（第一张为默认源，可传 pastedImageIndexes 指定某几张，strategy 决定合成一张还是每张各一张）；若改图依赖画面内容，先 analyze_image 再调用本工具。';

/** 创建 generate_image：出图或改图（支持多参考合成/批量），成功后逐张落盘为会话图片资产。 */
function createGenerateImageTool(chatId: string, pastedImageDataUrls?: string[]) {
  return tool({
    description:
      '根据描述生成或编辑图片。仅在用户明确要求出图或改图时调用；讨论绘画技巧时不要调用。',
    inputSchema: z.object({
      mode: z.enum(['generate', 'edit']).describe('generate=新图；edit=基于已有图修改'),
      prompt: z.string().min(1).describe('详细生图或改图描述；多参考时按顺序说明各图用途'),
      model: z.string().optional().describe('可选模型 ID；省略则使用当前生图模型'),
      sourceAssetIds: z
        .array(z.string())
        .optional()
        .describe('edit 时源图 assetId（历史生成图）；省略则以本轮粘贴图或 working image 为准'),
      pastedImageIndexes: z
        .array(z.number().min(0))
        .optional()
        .describe(
          'edit 时引用本轮粘贴图的 0 基序号（0=第一张）；省略时服务端只用第一张，不会自动用全部',
        ),
      strategy: z
        .enum(['merge', 'batch'])
        .optional()
        .describe(
          '仅 mode=edit 且多张参考时生效，必传：merge=多参考合成一张；batch=多张各出一张新图。漏传会静默按 merge 合成',
        ),
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
      {
        mode,
        prompt,
        model,
        sourceAssetIds,
        pastedImageIndexes,
        strategy,
        size,
        aspectRatio,
        transparent,
      },
      { abortSignal },
    ): Promise<ImageToolResult> => {
      try {
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }

        let refs: ResolvedRefs = { dataUrls: [], parentIds: [] };
        if (mode === 'edit') {
          const resolved = await resolveEditRefs({
            chatId,
            pastedImageDataUrls,
            sourceAssetIds,
            pastedImageIndexes,
          });
          if ('error' in resolved) {
            return { ok: false, error: resolved.error };
          }
          refs = resolved;
        }

        const modelId = resolveImageModelId({
          requestedModelId: model,
          parentModelId: refs.parentIds[0] ? resolveParentModelId(refs.parentIds[0]) : undefined,
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
          `[generate_image] model=${modelId} provider=${profile?.provider ?? '未知'} label=${profile?.label ?? '?'} mode=${mode} strategy=${strategy ?? (mode === 'edit' && refs.dataUrls.length > 1 ? 'merge' : '-')} refs=${refs.dataUrls.length} size=${resolvedSize ?? '默认'} aspectRatio=${normalizedAspectRatio ?? IMAGE_ASPECT_RATIO_AUTO}`,
        );

        // batch：多张各出一张。每张单独走一次 i2i，parentId 挂各自源；中断即停。
        // 先全部生成再统一落盘：若中途中断，不会留下带 message part 引用的孤儿资产，也不会把 working image 指向半成品。
        if (mode === 'edit' && strategy === 'batch' && refs.dataUrls.length > 1) {
          const generated: Array<{ bytes: Uint8Array; mimeType: string; parentId: string | null }> =
            [];
          for (let i = 0; i < refs.dataUrls.length; i++) {
            if (abortSignal?.aborted) {
              return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
            }
            const result = await generateImageViaRouter({
              modelId,
              prompt,
              mode: 'edit',
              referenceImageDataUrls: [refs.dataUrls[i]],
              size: resolvedSize,
              aspectRatio: normalizedAspectRatio,
              transparent,
              abortSignal,
            });
            if (abortSignal?.aborted) {
              return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
            }
            const first = result.images[0];
            if (!first) {
              return { ok: false, error: '生图服务未返回图片' };
            }
            generated.push({
              bytes: first.bytes,
              mimeType: first.mimeType,
              parentId: refs.parentIds[i],
            });
          }
          const assets: ImageToolAsset[] = [];
          for (const item of generated) {
            const asset = await saveImageAsset({
              chatId,
              parentId: item.parentId,
              modelId,
              prompt,
              bytes: item.bytes,
              mimeType: item.mimeType,
            });
            assets.push({
              assetId: asset.id,
              url: buildImageAssetUrl(asset.id),
              modelId: asset.modelId,
              parentId: asset.parentId,
            });
          }
          return { ok: true, assets };
        }

        // merge / generate / 单参考：一次调用
        const result = await generateImageViaRouter({
          modelId,
          prompt,
          mode,
          referenceImageDataUrls: refs.dataUrls.length ? refs.dataUrls : undefined,
          size: resolvedSize,
          aspectRatio: normalizedAspectRatio,
          transparent,
          abortSignal,
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
          parentId: refs.parentIds[0] ?? null,
          modelId,
          prompt,
          bytes: first.bytes,
          mimeType: first.mimeType,
        });

        return {
          ok: true,
          assets: [
            {
              assetId: asset.id,
              url: buildImageAssetUrl(asset.id),
              modelId: asset.modelId,
              parentId: asset.parentId,
            },
          ],
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
    // 兼容旧落盘形状：重构前成功 part 为 { ok:true, assetId }（无 assets 数组），
    // convertToModelMessages 重读旧会话时会走到这里，需归一，否则 output.assets.map 崩。
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `生图失败：${output.error}` };
      }
      const assetIds = normalizeImageAssets(output).map((asset) => asset.assetId);
      const count = assetIds.length;
      if (count === 0) {
        return {
          type: 'text',
          value:
            '图片已生成，但未返回 assetId。界面会自动展示，请用简短文字向用户说明，不要在正文中插入 Markdown 图片。',
        };
      }
      const idsText = assetIds.join('、');
      return {
        type: 'text',
        value:
          count > 1
            ? `已生成 ${count} 张图片，assetId 依次为 ${idsText}。改图时请将这些 id 放入 sourceAssetIds。界面会自动展示，请用简短文字向用户说明，不要在正文中插入 Markdown 图片、图片 URL 或 /api/images 链接。`
            : `图片已生成，assetId 为 ${idsText}。改图时请将该 id 放入 sourceAssetIds。界面会自动展示，请用简短文字向用户说明，不要在正文中插入 Markdown 图片、图片 URL 或 /api/images 链接。`,
      };
    },
  });
}

export const generateImage: AgentToolDefinition = {
  id: 'generate_image',
  create: ({ chatId, pastedImageDataUrls }) => createGenerateImageTool(chatId, pastedImageDataUrls),
  getHint: getImageSystemHint,
  getPasteHint: () => PASTE_IMAGE_EDIT_HINT,
};
