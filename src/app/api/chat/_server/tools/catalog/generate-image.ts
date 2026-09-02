import { tool } from 'ai';
import { z } from 'zod';

import {
  assetToDataUrl,
  buildImageAssetUrl,
  getAsset,
  getWorkingAsset,
  listProductImageAssets,
  PRODUCT_IMAGE_MODEL_ID,
  resolveParentModelId,
  saveImageAsset,
} from '@/app/api/images/_server/assets';
import {
  describeImageModels,
  getConfiguredImageModelId,
  getCurrentImageModelId,
  getImageModelProfile,
} from '@/app/api/images/_server/registry';
import { generateImageViaRouter, resolveImageModelId } from '@/app/api/images/_server/router';
import {
  describeImageQuality,
  describeImageSize,
  getImageSpec,
  IMAGE_ASPECT_RATIO_AUTO,
  IMAGE_ASPECT_RATIOS,
  IMAGE_QUALITY_VALUES,
  isValidImageSize,
  resolveImageQuality,
} from '@/app/api/images/_server/image-spec';
import {
  IMAGE_TOOL_INTERRUPTED_ERROR,
  IMAGE_TOOL_PASTE_SOURCE_ERROR,
} from '@/app/api/chat/_shared/tool-errors';
import type { ImagePurpose } from '@/app/api/chat/_shared/types';
import { PROMPT_HARD_CONSTRAINTS } from '@/lib/skills/server/catalog/ecommerce-image/constants';
import { listImageGroupingSkillIds } from '@/lib/skills/server/registry';
import type { AgentToolDefinition } from '../types';
import { normalizeImageAssets } from './legacy-output';

const SIZE_FORMAT_PATTERN = /^\d+(?:\.\d+)?K$|^\d+x\d+$/i;
const ASPECT_RATIO_PATTERN = /^(auto|\d+:\d+)$/i;

/**
 * 电商改图的服务端守卫（追加到出站 prompt 末尾，落盘仍用原始 prompt，不回流）。
 * 兜底「主模型失忆」：即便模型没在首次 prompt 重申产品保真/文字占比/画面完整，出站也强制带上，
 * 避免多轮 i2i 让产品本体漂移、文字占比失控、画面出现空占位色块。追加到 prompt 末尾，不与模型前端分工首句冲突。
 */
const ECOMMERCE_EDIT_PROMPT_GUARD = `（服务端强制）第1个参考图=产品本体，形状/颜色/材质/细节严格100%不变；其余参考仅作背景/色调/氛围/构图语言的风格参考，不改变产品本体。文字按最小编排：${PROMPT_HARD_CONSTRAINTS}；文字禁任何投影/描边/发光等阴影效果；文字与产品场景背景自然融为一体，勿用与背景割裂的实心纯色块/不透明底板，文案区与产品画面须连续成一张照片。`;

/** 生图失败（非用户中断）打服务端日志；面向用户的文案仍走工具 output。 */
function logImageToolFailure(fields: {
  error: string;
  mode: string;
  modelId?: string;
  size?: string;
  cause?: unknown;
}) {
  console.error('[generate_image]', fields);
}

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
  // 电商图类型标记（主图/详情图/营销图）：模型显式传入，供前端按类型分组展示；无关场景不传则省略
  type?: ImagePurpose;
  // 本回合激活了「声明分组能力」的 skill（如电商设计）时为 true，前端据此启用分类渲染
  imageGrouping?: boolean;
};

export type ImageToolFailure = {
  ok: false;
  error: string;
};

export type ImageToolResult = ImageToolSuccess | ImageToolFailure;

/**
 * type 入参归一表：形码（main/detail/marketing）与中文别名都映射到内码；未知值丢弃（undefined）。
 * 用 Map 而非普通对象字面量：对象会从 Object.prototype 继承 constructor/toString 等键，
 * 模型误传这类值会命中继承的函数而非 undefined，导致 type 污染 output 后又被 JSON 静默丢弃。
 */
const IMAGE_PURPOSE_ALIASES = new Map<string, ImagePurpose>([
  ['main', 'main'],
  ['detail', 'detail'],
  ['marketing', 'marketing'],
  ['主图', 'main'],
  ['商品主图', 'main'],
  ['详情图', 'detail'],
  ['商品详情图', 'detail'],
  ['详情', 'detail'],
  ['营销图', 'marketing'],
]);

/** 归一电商图类型：trim + 小写（中文不受影响），命中别名表才返回内码；未知值返回 undefined（正常出图，仅不参与分组） */
function normalizeImagePurpose(type: string | undefined): ImagePurpose | undefined {
  if (!type) return undefined;
  return IMAGE_PURPOSE_ALIASES.get(type.trim().toLowerCase());
}

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
  anchorProductAssetId,
}: {
  chatId: string;
  pastedImageDataUrls?: string[];
  sourceAssetIds?: string[];
  pastedImageIndexes?: number[];
  /** 电商改图时前置的产品图锚点 id（哨兵资产），保证产品本体始终有参考底，防止多轮漂移 */
  anchorProductAssetId?: string;
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

  // 历史资产路径：sourceAssetIds 缺省退化为工作图。电商可传产品图锚点，
  // 缺失/未含时前置到首位，避免仅以「上一张生成图」为唯一底导致多轮漂移（产品本体参考回退到底）。
  let sourceIds = sourceAssetIds?.length
    ? [...sourceAssetIds]
    : [(await getWorkingAsset(chatId))?.id].filter((id): id is string => Boolean(id));
  if (anchorProductAssetId && !sourceIds.includes(anchorProductAssetId)) {
    sourceIds = [anchorProductAssetId, ...sourceIds];
  }
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
  const configured = getConfiguredImageModelId();
  const modelLine = configured
    ? `- 生图模型：全局设置为 ${configured}，绝对优先，勿改`
    : `- 生图模型：未设置全局默认，请按场景自选。设计出图主力：写实/商拍/精细文字→gpt-image-2-vip，艺术插画/创意/色彩→gemini-3.1-flash-image（Nano Banana 2）；预算与速度优先→gemini-flash-lite 或 seedream-5-0-lite；仅对设计要求不高的一般场景→seedream-4-5。仅当确需换模型或编辑历史图需保持原模型时传 model`;
  const spec = getImageSpec(getCurrentImageModelId());
  const presets = spec.size.presets.join('/');
  const sizeLine = configured
    ? spec.minPixels != null && spec.maxPixels != null
      ? `- 生图尺寸只传 ${presets}，或总像素 ${spec.minPixels} ~ ${spec.maxPixels} 的 WIDTHxHEIGHT（默认 ${spec.size.default}）`
      : `- 生图尺寸只传 ${presets}（默认 ${spec.size.default}）`
    : `- 生图尺寸随所选模型而异（档位/像素区间见该模型说明），默认 2K；编辑历史图时以该图模型为准`;
  return `生图工具使用规则：
- 用户明确要求生成/绘制/出图时调用 generate_image，mode=generate
- 用户要求修改图片时调用 generate_image，mode=edit
- 仅讨论如何画、不请求出图时不要调用
- 面向电商/商品出图（用产品图为底生成主图/详情图/营销图的 i2i）时：须已锁定目标平台（淘宝/天猫、京东、拼多多、抖音、小红书之一；用户只传产品图时先识图分析再请用户选定，未锁定不得调用）。出主图须先向用户展示逐张规划（第 X 张：营销任务 + 视觉要点）再展示拟用提示词，待用户明确确认（「确认/就用这个出图/开始生成」）后再调用本工具；用户给的类型/数量/平台/画幅属方案输入，不视为出图指令，未经确认不得出图。仅用户明说「直接出图/不用确认」时可跳过提示词全文确认，但仍须已锁定目标平台且已列出主图逐张规划（未锁定则先问平台；无规划不得出主图）
- 有源图且改图/按图生图指令依赖画面内容（复刻风格、改文字、提取局部、指定元素）时：先调用 analyze_image，再按分析结果调用本工具
- 用户本轮消息含图片附件并要求修改时：mode=edit，服务端优先使用该附件作源图，无需传 sourceAssetIds
- 用户贴了多张图并要求「把这些图一起合成一张」时：strategy=merge（多个参考合并成一张）；要求「把这几张各自都改成 X」时：必传 strategy=batch（每张各出一张新图），漏传会静默合成一张、用户多张请求被缩水
- 只对多张做批改或合成，必传 pastedImageIndexes 指认参考（0 基，0=第一张）；省略时服务端只用第一张，不会自动用全部。多参考按顺序在 prompt 说明图片用途（如「第1张作场景、第2张是主体」）
- 出电商主图/详情图/营销图系列、已有作为「系列风格定板」的样张/前图时：后续每张用 sourceAssetIds=[产品图 assetId, 定板图 assetId] 双参考，prompt 注明「第1个参考=产品主体严格保真，第2个参考=仅作风格参考（色板/色温/氛围/构图语言）」，勿传 strategy=batch、勿在系列内换 model
- 改刚生成的图：mode=edit，尽量传 sourceAssetIds（上一轮 tool 结果已含 assetId）；未传则服务端使用 working image
- 用户说「改上面那张 / 第二张」且无法对应到已知 assetId、用户也未贴图时：不要猜测、不要调用 edit，请用户将要修改的图复制粘贴到对话框后再试
- 生图成功后界面会自动展示图片；汇总回复时只用文字说明，勿在正文中插入 Markdown 图片或 URL
- 给用户的汇总文字不要出现 assetId、模型 id、图片 URL、/api/images 链接等内部标识；这些仅供工具入参（sourceAssetIds / model / assetId）内部复用，用户不关心也不懂。确需说明来源或所用模型时用用户能懂的说法（如「你上传的产品图」「写实商拍模型」），不要写出模型 id 或资产 id
- 用户明确要求透明背景、去底、抠图或 PNG alpha 时：transparent=true；未要求时不要传 true
- 生成应用图标 / App Icon / logo / 标志 / 品牌标识等需要「方形满铺」的图时：prompt 必须写明背景为单一纯色、满铺到画布四边、无内缩白边/留白、无圆角或超椭圆、无投影/发光/描边边框、无纹理；图形居中置于中央约 80% 安全区。此类图标默认不透明（勿设 transparent=true），仅用户明确要透明背景时才设 true
- 用户指定画面比例时传 aspectRatio（如 3:2、16:9）；不传或传 auto 时交由模型自选
- 生成电商主图/详情图/营销图时，每次调用显式传 type 标注类型（主图 main / 详情图 detail / 营销图 marketing）；非电商图勿传 type
${modelLine}
${sizeLine}`;
}

/** size 参数描述：已设置全局模型给出其规格；自选模式给出通用说明 */
function getSizeFieldDescribe(): string {
  const configured = getConfiguredImageModelId();
  if (configured) {
    return `${describeImageSize(getImageSpec(configured))}；编辑历史图时档位以该图模型为准`;
  }
  return '生图尺寸随所选模型而异（档位与像素区间见所选模型说明），默认 2K；编辑历史图时以该图模型为准';
}

/** quality 参数描述：按当前模型质量规格给出说明；仅支持 quality 的模型生效 */
function getQualityFieldDescribe(): string {
  const configured = getConfiguredImageModelId();
  if (configured) {
    return `${describeImageQuality(getImageSpec(configured))}；不支持 quality 的模型请在 prompt 用文字表达画质要求`;
  }
  return `生成质量：${IMAGE_QUALITY_VALUES.join('、')}（默认 high）；仅支持 quality 的模型生效，不支持时请在 prompt 用文字表达画质要求`;
}

const PASTE_IMAGE_EDIT_HINT =
  '本轮用户消息含图片附件，edit 将使用这些附件作源图（第一张为默认源，可传 pastedImageIndexes 指定某几张，strategy 决定合成一张还是每张各一张）；若改图依赖画面内容，先 analyze_image 再调用本工具。';

/** 创建 generate_image：出图或改图（支持多参考合成/批量），成功后逐张落盘为会话图片资产。 */
function createGenerateImageTool(
  chatId: string,
  pastedImageDataUrls?: string[],
  activatedSkillIds?: string[],
  stickySkillIds?: string[],
) {
  // 本会话是否有「声明分组能力」的 skill（如电商设计）：以「本轮激活 ∪ 会话粘滞」判定。
  // 只用本轮激活会漏掉 follow-up 回合——ecommerce 复激活依赖关键词/修订线索，短指令常命中不到，
  // 但会话粘滞（metadata.skillIds）只增不减，覆盖此类回合，故分类展示不因复激活失败而失效。
  const groupingSkillIds = new Set([...(activatedSkillIds ?? []), ...(stickySkillIds ?? [])]);
  const imageGrouping = [...groupingSkillIds].some((id) => listImageGroupingSkillIds().has(id));
  // 电商图 skill 激活（含会话粘滞）判定：用于服务端给 edit 兜底前置产品图锚点 + prompt 守卫
  const isEcommerceActive = [...groupingSkillIds].includes('ecommerce-image');
  return tool({
    description:
      '根据描述生成或编辑图片。仅在用户明确要求出图或改图时调用；讨论绘画技巧时不要调用；从产品图生成电商商品图（主图/详情图/营销图）时，须已锁定目标平台；出主图须已完成逐张规划并在用户确认方案与提示词后再调用。',
    inputSchema: z.object({
      mode: z.enum(['generate', 'edit']).describe('generate=新图；edit=基于已有图修改'),
      prompt: z.string().min(1).describe('详细生图或改图描述；多参考时按顺序说明各图用途'),
      model: z.string().optional().describe(describeImageModels()),
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
        .describe(getSizeFieldDescribe()),
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
      quality: z.enum(IMAGE_QUALITY_VALUES).optional().describe(getQualityFieldDescribe()),
      type: z
        .string()
        .optional()
        .describe(
          '电商图类型（仅电商图必传，用 main/detail/marketing 或中文主图/详情图/营销图）：生成主图传 main、详情图传 detail、营销图传 marketing，每次调用通过本字段标注该张图的类型，供前端按类型分组展示；非电商出图则不要传',
        ),
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
        quality,
        type,
      },
      { abortSignal },
    ): Promise<ImageToolResult> => {
      let modelId: string | undefined;
      let resolvedSize: string | undefined;
      try {
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }

        let refs: ResolvedRefs = { dataUrls: [], parentIds: [] };
        // 电商改图（非批量、且会话激活本 skill）时取最近产品图作锚点：服务端兜底，
        // 即便模型只传了「上一张生成图」，也强制补上产品本体参考，防止多轮漂移。
        const anchorProductAssetId =
          isEcommerceActive && mode === 'edit' && strategy !== 'batch'
            ? listProductImageAssets(chatId)[0]?.id
            : undefined;
        if (mode === 'edit') {
          const resolved = await resolveEditRefs({
            chatId,
            pastedImageDataUrls,
            sourceAssetIds,
            pastedImageIndexes,
            anchorProductAssetId,
          });
          if ('error' in resolved) {
            logImageToolFailure({ error: resolved.error, mode });
            return { ok: false, error: resolved.error };
          }
          refs = resolved;
        }

        // 参考集含产品图锚点 → 出站 prompt 追加服务端守卫（产品保真 + 文字占比）；落盘仍用原始 prompt，不回流。
        const hasProductRef = Boolean(
          anchorProductAssetId && refs.parentIds.includes(anchorProductAssetId),
        );
        const outboundPrompt = hasProductRef ? `${prompt}\n${ECOMMERCE_EDIT_PROMPT_GUARD}` : prompt;

        // 系列主图「产品图 + 样张/定板图」双参考时，首参考常为产品图（哨兵 user-upload）；
        // 若仍只取 parentIds[0] 的 model，会因哨兵被 resolveImageModelId 跳过而落到默认模型。
        // 这里改向第一个真实生图模型的参考取 model，使系列沿用样张/定板图模型，保持风格连续。
        const referenceModelId = refs.parentIds
          .map((parentId) => resolveParentModelId(parentId))
          .find((candidate) => {
            const trimmed = candidate?.trim();
            return Boolean(trimmed) && trimmed !== PRODUCT_IMAGE_MODEL_ID;
          });
        modelId = resolveImageModelId({
          requestedModelId: model,
          parentModelId: referenceModelId,
        });

        const spec = getImageSpec(modelId);
        resolvedSize =
          size && isValidImageSize(size, spec) ? size.trim() : size ? spec.size.default : undefined;
        if (size && resolvedSize !== size.trim()) {
          console.warn(`[generate_image] size 已按模型规格回退: "${size}" -> "${resolvedSize}"`);
        }
        // 质量档位：仅支持 quality 的模型（gpt-image）透传；不支持时 resolveImageQuality 返回 undefined，请求不带该字段
        const resolvedQuality = resolveImageQuality(quality, spec);

        // 大小写不敏感归一 'auto' -> undefined，避免把 'Auto' 当比例串传上游
        const normalizedAspectRatio =
          aspectRatio?.toLowerCase() === IMAGE_ASPECT_RATIO_AUTO ? undefined : aspectRatio;

        // 电商图类型归一：形码/中文别名 → 内码；未知值丢为 undefined（正常出图，仅不参与类型分组）
        const normalizedType = normalizeImagePurpose(type);

        const profile = getImageModelProfile(modelId);
        console.info(
          `[generate_image] model=${modelId} provider=${profile?.provider ?? '未知'} label=${profile?.label ?? '?'} mode=${mode} strategy=${strategy ?? (mode === 'edit' && refs.dataUrls.length > 1 ? 'merge' : '-')} refs=${refs.dataUrls.length} size=${resolvedSize ?? '默认'} aspectRatio=${normalizedAspectRatio ?? IMAGE_ASPECT_RATIO_AUTO} quality=${resolvedQuality ?? '默认'}`,
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
              prompt: outboundPrompt,
              mode: 'edit',
              referenceImageDataUrls: [refs.dataUrls[i]],
              size: resolvedSize,
              quality: resolvedQuality,
              aspectRatio: normalizedAspectRatio,
              transparent,
              abortSignal,
            });
            if (abortSignal?.aborted) {
              return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
            }
            const first = result.images[0];
            if (!first) {
              logImageToolFailure({
                error: '生图服务未返回图片',
                mode,
                modelId,
                size: resolvedSize,
              });
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
          return {
            ok: true,
            assets,
            type: normalizedType,
            imageGrouping: imageGrouping || undefined,
          };
        }

        // merge / generate / 单参考：一次调用
        const result = await generateImageViaRouter({
          modelId,
          prompt: outboundPrompt,
          mode,
          referenceImageDataUrls: refs.dataUrls.length ? refs.dataUrls : undefined,
          size: resolvedSize,
          quality: resolvedQuality,
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
          logImageToolFailure({
            error: '生图服务未返回图片',
            mode,
            modelId,
            size: resolvedSize,
          });
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
          type: normalizedType,
          imageGrouping: imageGrouping || undefined,
        };
      } catch (err) {
        if (abortSignal?.aborted) {
          return { ok: false, error: IMAGE_TOOL_INTERRUPTED_ERROR };
        }
        logImageToolFailure({
          error: '生图服务暂不可用，请稍后重试',
          mode,
          modelId,
          size: resolvedSize,
          cause: err,
        });
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
            ? `已生成 ${count} 张图片。assetId（${idsText}）仅供后续 tool 调用：改图时放入 sourceAssetIds 即可；不要在给用户的正文中展示、复述这些 id 或模型 id。界面会自动展示图片，请用简短文字向用户说明，勿在正文中插入 Markdown 图片、图片 URL 或 /api/images 链接。`
            : `图片已生成。assetId（${idsText}）仅供后续 tool 调用：改图时放入 sourceAssetIds 即可；不要在给用户的正文中展示、复述该 id 或模型 id。界面会自动展示图片，请用简短文字向用户说明，勿在正文中插入 Markdown 图片、图片 URL 或 /api/images 链接。`,
      };
    },
  });
}

export const generateImage: AgentToolDefinition = {
  id: 'generate_image',
  create: ({ chatId, pastedImageDataUrls, activatedSkillIds, stickySkillIds }) =>
    createGenerateImageTool(chatId, pastedImageDataUrls, activatedSkillIds, stickySkillIds),
  getHint: getImageSystemHint,
  getPasteHint: () => PASTE_IMAGE_EDIT_HINT,
};
