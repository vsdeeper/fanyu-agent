import { IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/app/api/chat/_shared/tool-errors';
import type { ImagePurpose } from '@/app/api/chat/_shared/types';
import type { MessagePart } from '../utils';

export type GenerateImageAsset = {
  assetId: string;
  url?: string;
};

export type GenerateImageOutput = {
  ok?: boolean;
  /** 新形状：一次出图可能多张（批量/多参考合成）；每张一个资产 */
  assets?: GenerateImageAsset[];
  assetId?: string;
  url?: string;
  error?: string;
  /** 电商图类型标记（主图/详情图/营销图）：服务端归一后落盘，供按类型分组；无关场景省略 */
  type?: 'main' | 'detail' | 'marketing';
  /** 本轮激活了「声明分组能力」的 skill（如电商设计）时为 true，据此启用分类渲染 */
  imageGrouping?: boolean;
};

/**
 * 兼容旧单资产形状：无 assets 时用 assetId 兜底成单元素数组。
 * 注意：与 chat/_server/tools/catalog/legacy-output.ts 的 normalizeImageAssets 判定保持一致（新 assets 优先，否则旧 assetId），
 * 改判定须两侧同步，避免旧会话语义漂移。
 */
export function getImageAssets(output: GenerateImageOutput | undefined): GenerateImageAsset[] {
  if (output?.assets?.length) return output.assets;
  // 与服务端 legacy-output.normalizeImageAssets 判定保持一致：仅认 assetId（url 只是渲染源，不算是资产标识）。
  if (output?.assetId) {
    return [{ assetId: output.assetId, url: output.url }];
  }
  return [];
}

export function getImageSrc(output: GenerateImageOutput): string {
  return output.url || `/api/images/${output.assetId}`;
}

export function isGenerateImagePending(state: string): boolean {
  return (
    state === 'input-streaming' || state === 'input-available' || state === 'approval-requested'
  );
}

export function isGenerateImageFailed(
  state: string,
  output: GenerateImageOutput | undefined,
): boolean {
  return state === 'output-error' || output?.ok === false;
}

/** 缺源图：未真正出图，不展示失败缩略图，由主模型文字提示用户粘贴 */
export function isGenerateImageSourceMissing(output: GenerateImageOutput | undefined): boolean {
  return output?.ok === false && output.error === IMAGE_TOOL_PASTE_SOURCE_ERROR;
}

export function isGenerateImageReady(output: GenerateImageOutput | undefined): boolean {
  return output?.ok === true && getImageAssets(output).length > 0;
}

/**
 * 预览图册用：按 parts 数组序 → 每个 part 的 assets 数组序 摊平出可预览图片的有序列表。
 * 缩略图行与 PreviewGroup 的 items 都以此为准，保证两者顺序一致。
 * 修复：antd PreviewGroup 默认按图片组件注册（挂载）顺序生成预览序列，流式生成时就绪顺序 ≠ parts 顺序，
 * 导致点开缩略图时「N/M」序号错位；改用 items 后按 src 在有序列表查找，即可对齐缩略图顺序。
 */
export function getPreviewableImages(parts: ReadonlyArray<MessagePart>): Array<{ src: string }> {
  const result: Array<{ src: string }> = [];
  for (const part of parts) {
    const output = part.output as GenerateImageOutput | undefined;
    if (!(output && isGenerateImageReady(output))) continue;
    for (const asset of getImageAssets(output)) {
      result.push({ src: asset.url || `/api/images/${asset.assetId}` });
    }
  }
  return result;
}

export type GenerateImageInGroup = { src: string; assetId?: string };

export const GENERATE_IMAGE_CATEGORY_LABELS: Record<ImagePurpose, string> = {
  main: '主图',
  detail: '详情图',
  marketing: '营销图',
};

/** 产品图 type 标记 → 类型内码（与服务端 generate_image 的 ImagePurpose，见 _shared/types）；未识别返回 undefined（不参与分组） */
export function getImageCategory(type: string | undefined): ImagePurpose | undefined {
  return type === 'main' || type === 'detail' || type === 'marketing' ? type : undefined;
}

export type GenerateImageGroup = {
  category: ImagePurpose;
  items: GenerateImageInGroup[];
};

export type CategorizedGroupsResult = {
  groups: GenerateImageGroup[];
  /** 是否所有就绪图都带可识别 type（避免把漏标 type 的图隐藏掉） */
  allTyped: boolean;
};

/**
 * 就绪 = 生成成功（isGenerateImageReady：output.ok===true 且有 assets，缩略图可渲染展示，非挂起/失败阶段）。
 * 按 parts→assets 顺序把就绪图片按 type 分桶（仅返回非空桶，固定 main→detail→marketing）。
 * 未就绪（挂起 Skeleton）、失败、缺源图不进入；未带可识别 type 的就绪图只置 anyUntyped（不落桶）。
 */
export function getCategorizedGroups(parts: ReadonlyArray<MessagePart>): CategorizedGroupsResult {
  const buckets: Record<ImagePurpose, GenerateImageInGroup[]> = {
    main: [],
    detail: [],
    marketing: [],
  };
  let anyTyped = false;
  let anyUntyped = false;

  for (const part of parts) {
    const output = part.output as GenerateImageOutput | undefined;
    if (!(output && isGenerateImageReady(output))) continue;
    const category = getImageCategory(output.type);
    if (category) {
      anyTyped = true;
    } else {
      anyUntyped = true;
    }
    for (const asset of getImageAssets(output)) {
      if (!category) continue;
      buckets[category].push({
        src: asset.url || `/api/images/${asset.assetId}`,
        assetId: asset.assetId,
      });
    }
  }

  const groups = (['main', 'detail', 'marketing'] as const)
    .map<GenerateImageGroup>((category) => ({ category, items: buckets[category] }))
    .filter((group) => group.items.length > 0);

  return { groups, allTyped: anyTyped && !anyUntyped };
}
