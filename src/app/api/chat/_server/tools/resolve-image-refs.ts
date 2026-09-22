import 'server-only';

import { IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/app/api/chat/_shared/tool-errors';
import { assetToDataUrl, getAsset, getWorkingAsset } from '@/app/api/images/_server/assets';

/** 解析出的参考图集：data URL 数组 + 每个来源的 parentId（粘贴图为 null，历史资产为其 assetId）。 */
export type ResolvedImageRefs = {
  dataUrls: string[];
  parentIds: (string | null)[];
};

/**
 * 解析工具用的参考源数组。优先级：显式 pastedImageIndexes → 本轮粘贴图（默认第 0 张）→
 * 历史资产 sourceAssetIds → 会话工作图。越界或资产不属当前会话时返回友好错误。
 */
export async function resolveImageRefs({
  chatId,
  pastedImageDataUrls,
  sourceAssetIds,
  pastedImageIndexes,
}: {
  chatId: string;
  pastedImageDataUrls?: string[];
  sourceAssetIds?: string[];
  pastedImageIndexes?: number[];
}): Promise<ResolvedImageRefs | { error: string }> {
  const sources: Array<{ dataUrl: string; parentId: string | null }> = [];

  // 粘贴图是主路径：优先于历史资产。默认仅取第一张（与「第一张为默认源」提示一致）；
  // 多参考须由模型显式传 pastedImageIndexes，避免省略参数时把多张错误地当作全部参考。
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

  // 历史资产路径：sourceAssetIds 缺省退化为工作图。
  const sourceIds = sourceAssetIds?.length
    ? [...sourceAssetIds]
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
