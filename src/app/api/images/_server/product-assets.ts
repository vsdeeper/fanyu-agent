import 'server-only';

import { createHash } from 'crypto';

import {
  findAssetByFileName,
  listProductImageAssets,
  listReferenceImageAssets,
  saveImageAsset,
  USER_PRODUCT_MODEL_ID,
  USER_REFERENCE_MODEL_ID,
  type ImageAssetRecord,
} from './assets';
import { decodeBase64Image, sniffImageMime } from './image-utils';

export type UserUploadRole = 'product' | 'reference';

const ROLE_MODEL_ID = {
  product: USER_PRODUCT_MODEL_ID,
  reference: USER_REFERENCE_MODEL_ID,
} as const;

const ROLE_PROMPT = {
  product: '用户上传的产品图',
  reference: '用户上传的设计参考图',
} as const;

/**
 * 电商用户上传图落盘：按角色写成哨兵资产（user-product / user-reference，不动 working image），
 * 使主模型跨轮用 assetId 作 generate_image 的 sourceAssetIds / analyze_image 的 assetId。
 * 仅电商设计链路经 register_ecommerce_images 调用；不在 HTTP 入口按粘贴无差别桥接。
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

/**
 * 按角色落盘一张用户上传图；同一 (chatId, 角色, 内容 hash) 已存在则复用，不新增行。
 * 返回落盘或已存在的资产。
 */
export async function saveLabeledUserUpload(
  chatId: string,
  dataUrl: string,
  role: UserUploadRole,
): Promise<ImageAssetRecord> {
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const fileName = `${ROLE_MODEL_ID[role]}-${hash}.${extFor(mimeType)}`;
  const existing = findAssetByFileName(chatId, fileName);
  if (existing) {
    return existing;
  }
  return saveImageAsset({
    chatId,
    parentId: null,
    modelId: ROLE_MODEL_ID[role],
    prompt: ROLE_PROMPT[role],
    bytes,
    mimeType,
    fileName,
    setWorking: false,
  });
}

/**
 * 组装电商上传图 id 提示；无已登记资产且无待登记图时返回空串。
 * 仅电商设计链路注入。
 */
export function getEcommerceUploadHint(chatId: string, pendingUploadCount: number): string {
  const products = listProductImageAssets(chatId);
  const references = listReferenceImageAssets(chatId);
  if (products.length === 0 && references.length === 0 && pendingUploadCount === 0) {
    return '';
  }

  const lines: string[] = [];
  if (products.length > 0) {
    const ids = products.map((asset) => asset.id).join('、');
    lines.push(
      `【产品图】本会话产品图资产 id：${ids}；出图/改图时作 generate_image 的 sourceAssetIds 首位（身份锚点），或 analyze_image 的 assetId。这些 id 仅供工具入参：不要向用户展示、复述；确需说明来源时用「你上传的产品图」。`,
    );
  }
  if (references.length > 0) {
    const ids = references.map((asset) => asset.id).join('、');
    lines.push(
      `【参考图】本会话设计参考图资产 id：${ids}；作风格参考时放入 generate_image 的 sourceAssetIds（排在产品图之后），不要当作产品本体。这些 id 仅供工具入参：不要向用户展示、复述；确需说明来源时用「你上传的参考图」。`,
    );
  }
  if (pendingUploadCount > 0) {
    lines.push(
      `本轮有 ${pendingUploadCount} 张待登记上传图（0 基下标 0～${pendingUploadCount - 1}）：请按用户意图调用 register_ecommerce_images 分类落盘；多张且未说明哪张是产品图/参考图时先问用户，不要猜测、不要先出图。`,
    );
  }
  return `\n\n${lines.join('\n')}`;
}
