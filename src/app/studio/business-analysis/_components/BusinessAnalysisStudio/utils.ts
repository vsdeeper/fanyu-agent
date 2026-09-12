import type {
  BusinessAnalysisAnalyzeRequest,
  BusinessAnalysisDocumentInput,
  BusinessAnalysisImageInput,
} from '@/app/api/studio/business-analysis/_shared/types';
import { BUSINESS_ANALYSIS_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/business-analysis/_shared/task-constants';
import type {
  BusinessAnalysisStepKey,
  BusinessAnalysisTaskStepRecord,
} from '@/app/api/studio/business-analysis/_shared/task-types';
import { MAX_PRODUCT_DOCS } from '@/business-components/ProductDocsUpload/constants';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { apiPut } from '@/lib/shared/client/api-client';
import {
  appendUploadItems,
  readUploadItemAsDataUrl,
  removeUploadItem,
  revokeUploadItemUrls,
  serializeUploadItem,
} from '@/app/studio/_utils/upload-items';
import { downloadZipBlob, zipFiles } from '@/app/studio/_utils/export-archive';
import { EXPORT_ARCHIVE_NAME, ANALYSIS_FILE_NAME } from './constants';
import type { AnalysisStepSnapshot, ProductDocItem, ProductImageItem, StudioPhase } from './types';

export { assertOkOrJsonFail, isAbortError } from '@/app/studio/_utils/generate-stream';
export { createRafTextBuffer, consumeAnalyzeSse } from '@/app/studio/_utils/analyze-stream';

/**
 * 将选择的文件追加为本地预览项；超出上限的部分丢弃。
 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
  max = MAX_STUDIO_IMAGES,
): ProductImageItem[] {
  return appendUploadItems(current, files, max, (file, previewUrl) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl,
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    size: file.size,
  }));
}

/** 按 uid 移除预览项并释放 object URL */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  return removeUploadItem(current, uid);
}

/** 卸载时释放全部 object URL */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
  revokeUploadItemUrls(items);
}

/** 将选择的资料追加为本地项；超出上限的部分丢弃。 */
export function appendProductDocs(
  current: ProductDocItem[],
  files: File[],
  max = MAX_PRODUCT_DOCS,
): ProductDocItem[] {
  return appendUploadItems(current, files, max, (file, previewUrl) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl,
    name: file.name,
    mimeType: toDocMediaType(file),
    size: file.size,
  }));
}

/** 按 uid 移除资料并释放 object URL */
export function removeProductDoc(current: ProductDocItem[], uid: string): ProductDocItem[] {
  return removeUploadItem(current, uid);
}

/** 卸载时释放资料 object URL */
export function revokeProductDocUrls(items: ProductDocItem[]): void {
  revokeUploadItemUrls(items);
}

/** 本地 txt/md 的 MIME。 */
export function toDocMediaType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

/** 本地产品图转分析接口 images 字段 */
export async function toAnalyzeImages(
  images: ProductImageItem[],
): Promise<BusinessAnalysisImageInput[]> {
  return Promise.all(
    images.map(async (item) => ({
      filename: item.name,
      mediaType: item.mimeType || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 本地资料转分析接口 documents 字段 */
export async function toAnalyzeDocuments(
  documents: ProductDocItem[],
): Promise<BusinessAnalysisDocumentInput[]> {
  return Promise.all(
    documents.map(async (item) => ({
      filename: item.name,
      mediaType: item.mimeType,
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 品牌 Logo 参考图（至多一张）的 data URL；未上传返回 undefined。 */
export async function readBrandLogoDataUrl(
  images: ProductImageItem[],
): Promise<string | undefined> {
  const first = images[0];
  return first ? readUploadItemAsDataUrl(first) : undefined;
}

/**
 * 能否开始分析：四项素材（产品精修图 / 品牌 Logo / 产品说明 / 产品资料）至少一项非空。
 *
 * 左栏按钮禁用与 handleAnalyze 的守卫共用本判据，避免同一规则写成两份而出现「按钮可点但点下去被拦」。
 * 服务端另有宽松校验与运行时判定（产品资料要看实际解析出的文本），三处口径需一致。
 */
export function hasAnalyzeMaterials(input: {
  images: ProductImageItem[];
  brandLogo: ProductImageItem[];
  productDescription: string;
  documents: ProductDocItem[];
}): boolean {
  return (
    input.images.length > 0 ||
    input.brandLogo.length > 0 ||
    Boolean(input.productDescription.trim()) ||
    input.documents.length > 0
  );
}

/**
 * 组装分析请求体；空值一律不写键，由服务端复核「至少一项非空」。
 *
 * Logo 的读取要吞错降级：历史资产可能已被删而 404，此时当作「不带 Logo」继续分析，不把整轮卡死。
 */
export async function toAnalyzePayload(
  images: ProductImageItem[],
  documents: ProductDocItem[],
  options: { brandLogo?: ProductImageItem[]; productDescription?: string } = {},
): Promise<BusinessAnalysisAnalyzeRequest> {
  let brandLogoDataUrl: string | undefined;
  try {
    brandLogoDataUrl = await readBrandLogoDataUrl(options.brandLogo ?? []);
  } catch (err) {
    console.error('[business-analysis-studio] read brand logo', err);
  }
  const productDescription = options.productDescription?.trim();
  return {
    images: await toAnalyzeImages(images),
    ...(documents.length > 0 ? { documents: await toAnalyzeDocuments(documents) } : {}),
    ...(brandLogoDataUrl ? { brandLogoDataUrl } : {}),
    ...(productDescription ? { productDescription } : {}),
  };
}

/**
 * 构造商业分析步骤的完整持久化快照。
 *
 * 键序与空值处理必须与 `readAnalysisStepSnapshot` 对称（原因见 isSameStepSnapshot）；
 * productDescription 先 trim，纯空白不能落成键。
 */
export async function createAnalysisStepSnapshot(
  images: ProductImageItem[],
  documents: ProductDocItem[],
  brandLogo: ProductImageItem[],
  productDescription: string,
  analysisText: string,
): Promise<AnalysisStepSnapshot> {
  const description = productDescription.trim();
  return {
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    documents: (await Promise.all(documents.map(serializeUploadItem))) as ProductDocItem[],
    ...(brandLogo.length > 0
      ? {
          brandLogoImages: (await Promise.all(
            brandLogo.map(serializeUploadItem),
          )) as ProductImageItem[],
        }
      : {}),
    ...(description ? { productDescription: description } : {}),
    analysisText,
  };
}

/**
 * 比较两份可序列化步骤快照是否相同；无基线视为已变化。
 *
 * 这里用朴素 JSON.stringify 而非按键排序的稳定序列化，故 create / read 必须产出完全相同的键序。
 * 给其中一边加字段或调整字段顺序会让每次「下一步」都判定为已变化，重存快照并重复落盘资产。
 */
export function isSameStepSnapshot(next: unknown, baseline: unknown): boolean {
  if (baseline === undefined) return false;
  return JSON.stringify(next) === JSON.stringify(baseline);
}

/** 保存步骤快照，并返回服务端替换资产 URL 后的数据。 */
export async function saveStudioStep<T>(
  taskId: string,
  stepKey: BusinessAnalysisStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<BusinessAnalysisTaskStepRecord>(
    `/api/studio/business-analysis/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: BUSINESS_ANALYSIS_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 再次进入流程时：有分析正文则视为已完成分析。 */
export function resolveInitialStudioPhase(analysis: AnalysisStepSnapshot | undefined): StudioPhase {
  return analysis?.analysisText.trim() ? 'analyzed' : 'input';
}

/**
 * 从未知 JSON 中读取商业分析快照。
 * 可选字段的键序与空值处理必须与 `createAnalysisStepSnapshot` 对称（原因见 isSameStepSnapshot）。
 */
export function readAnalysisStepSnapshot(value: unknown): AnalysisStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<AnalysisStepSnapshot>;
  if (!Array.isArray(snapshot.images) || !Array.isArray(snapshot.documents)) return undefined;
  const brandLogoImages =
    Array.isArray(snapshot.brandLogoImages) && snapshot.brandLogoImages.length > 0
      ? snapshot.brandLogoImages
      : undefined;
  const description =
    typeof snapshot.productDescription === 'string' ? snapshot.productDescription.trim() : '';
  return {
    images: snapshot.images,
    documents: snapshot.documents,
    ...(brandLogoImages ? { brandLogoImages } : {}),
    ...(description ? { productDescription: description } : {}),
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : '',
  };
}

/** 打包并下载商业分析 Markdown。 */
export async function exportAnalysisArchive(analysisText: string): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  if (analysisText.trim()) {
    files[ANALYSIS_FILE_NAME] = new TextEncoder().encode(analysisText);
  }
  downloadZipBlob(await zipFiles(files), EXPORT_ARCHIVE_NAME);
}
