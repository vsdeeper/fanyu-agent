import 'server-only';

import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { imageAssets } from '@/lib/db/schema';
import { listProductImageAssets, PRODUCT_IMAGE_MODEL_ID, saveImageAsset } from './assets';
import { decodeBase64Image, sniffImageMime } from './image-utils';

const PRODUCT_IMAGE_PROMPT = '用户上传的产品图（桥接）';

/**
 * 产品图落盘桥接：把本轮粘贴/上传的产品图存为「哨兵资产」（modelId='user-upload'，不动 working image），
 * 使主模型在后续轮次仍能用其 assetId 作为 generate_image 的 sourceAssetIds / analyze_image 的 assetId。
 * 无产品图桥接前，粘贴图只存在于「最新一条消息」，隔轮即不可引用。
 */

/** 解析 data URL 为字节与 MIME；base64 部分解码，MIME 优先用文件头识别 */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('无效的图片 data URL');
  }
  const header = dataUrl.slice(0, commaIdx);
  const b64 = dataUrl.slice(commaIdx + 1);
  const bytes = decodeBase64Image(b64);
  const headerMime = header.match(/data:([^;]+)(?:;base64)?/i)?.[1];
  return { bytes, mimeType: sniffImageMime(bytes, headerMime || 'image/jpeg') };
}

function extFor(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpeg';
}

/** 是否已按 (chatId, fileName) 落盘过；用于幂等，中断后「继续」不产生重复产品资产行 */
function productAssetExists(chatId: string, fileName: string): boolean {
  const db = getDb();
  const row = db
    .select({ id: imageAssets.id })
    .from(imageAssets)
    .where(and(eq(imageAssets.chatId, chatId), eq(imageAssets.fileName, fileName)))
    .get();
  return Boolean(row);
}

/** 把当前轮次的粘贴/上传产品图逐一落盘为哨兵资产；已存在则跳过。单张失败不阻断整轮。 */
export async function bridgePastedProductImages(
  chatId: string,
  pastedImageDataUrls: string[],
): Promise<void> {
  if (pastedImageDataUrls.length === 0) return;
  for (const dataUrl of pastedImageDataUrls) {
    try {
      const { bytes, mimeType } = dataUrlToBytes(dataUrl);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
      const fileName = `product-${hash}.${extFor(mimeType)}`;
      if (productAssetExists(chatId, fileName)) {
        continue;
      }
      await saveImageAsset({
        chatId,
        parentId: null,
        modelId: PRODUCT_IMAGE_MODEL_ID,
        prompt: PRODUCT_IMAGE_PROMPT,
        bytes,
        mimeType,
        fileName,
        setWorking: false,
      });
    } catch (err) {
      console.error('[product-asset] 产品图桥接失败', err);
    }
  }
}

/** 组装产品图 id 提示；无产品资产时返回空串。供主模型跨轮引用产品图 assetId。 */
export function getProductImageHint(chatId: string): string {
  const assets = listProductImageAssets(chatId);
  if (assets.length === 0) return '';
  const ids = assets.map((asset) => asset.id).join('、');
  return `\n\n【产品图】本会话产品图资产 id：${ids}；以产品图为底出图时请用这些 id 作 generate_image 的 sourceAssetIds 或 analyze_image 的 assetId。这些 id 仅供工具入参复用：不要向用户展示、复述，也不要在正文里写成「以 xxx(assetId) 为底」；确需说明来源时用「你上传的产品图」等用户能懂的说法。`;
}
