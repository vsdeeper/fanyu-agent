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

/** 组装分析请求体：仅产品图与资料 */
export async function toAnalyzePayload(
  images: ProductImageItem[],
  documents: ProductDocItem[],
): Promise<BusinessAnalysisAnalyzeRequest> {
  return {
    images: await toAnalyzeImages(images),
    ...(documents.length > 0 ? { documents: await toAnalyzeDocuments(documents) } : {}),
  };
}

/** 构造商业分析步骤的完整持久化快照。 */
export async function createAnalysisStepSnapshot(
  images: ProductImageItem[],
  documents: ProductDocItem[],
  analysisText: string,
): Promise<AnalysisStepSnapshot> {
  return {
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    documents: (await Promise.all(documents.map(serializeUploadItem))) as ProductDocItem[],
    analysisText,
  };
}

/** 比较两份可序列化步骤快照是否相同；无基线视为已变化。 */
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

/** 从未知 JSON 中读取商业分析快照。 */
export function readAnalysisStepSnapshot(value: unknown): AnalysisStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<AnalysisStepSnapshot>;
  if (!Array.isArray(snapshot.images) || !Array.isArray(snapshot.documents)) return undefined;
  return {
    images: snapshot.images,
    documents: snapshot.documents,
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
