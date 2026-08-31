import { IMAGE_TOOL_PASTE_SOURCE_ERROR } from '@/app/api/chat/_shared/tool-errors';

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
