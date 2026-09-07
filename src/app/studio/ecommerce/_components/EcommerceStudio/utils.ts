import type {
  BusinessAnalysisAnalyzeRequest,
  BusinessAnalysisDocumentInput,
  BusinessAnalysisImageInput,
} from '@/app/api/studio/business-analysis/_shared/types';
import type {
  StudioGenerateImageEvent,
  StudioGenerateRequest,
} from '@/app/api/studio/_shared/generate-types';
import { ECOMMERCE_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/ecommerce/_shared/task-constants';
import type {
  EcommerceStepKey,
  EcommerceTaskStepRecord,
  EcommerceTaskType,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import { MAX_PRODUCT_DOCS } from '@/business-components/ProductDocsUpload/constants';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { apiDelete, apiPut } from '@/lib/shared/client/api-client';
import {
  applyGenerateEvent,
  pendingImages as pendingImagesFromCount,
} from '@/app/studio/_utils/generate-stream';
import {
  appendUploadItems,
  readUploadItemAsDataUrl,
  removeUploadItem,
  revokeUploadItemUrls,
  serializeUploadItem,
} from '@/app/studio/_utils/upload-items';
import type {
  AnalysisStepSnapshot,
  DesignStepSnapshot,
  DesignFormState,
  DesignResultGroups,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
  VisualStepSnapshot,
} from './types';

export {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  isAbortError,
  pendingImages as pendingImagesFromCount,
} from '@/app/studio/_utils/generate-stream';
export { consumeAnalyzeSse, createRafTextBuffer } from '@/app/studio/_utils/analyze-stream';
export type { RafTextBuffer } from '@/app/studio/_utils/analyze-stream';
export { getSelectedImageUrl as getSelectedResultImageUrl } from '@/app/studio/_utils/result-images';
export {
  readFileAsDataUrl,
  readUrlAsDataUrl,
  readUploadItemAsDataUrl,
} from '@/app/studio/_utils/upload-items';

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

/**
 * 将选择的资料追加为本地项；超出上限的部分丢弃。
 */
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

/** 营销主视觉请求体：表单规格 + 商业分析正文 + 产品图 */
export async function toVisualGeneratePayload(
  form: StudioFormState,
  analysisText: string,
  productImages: ProductImageItem[],
): Promise<StudioGenerateRequest> {
  return {
    kind: 'visual',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    analysisText: analysisText.trim(),
    productViewImages: await toAnalyzeImages(productImages),
  };
}

/** 视觉设计请求体：表单 + 分析/全部产品图 + 已选主视觉标准 + 可选模特形象 */
export async function toDesignGeneratePayload(
  form: DesignFormState,
  analysisText: string,
  productImages: ProductImageItem[],
  visualDataUrl: string,
  modelImages: BusinessAnalysisImageInput[] = [],
): Promise<StudioGenerateRequest> {
  const includeModel = modelImages.length > 0;
  return {
    kind: 'design',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    taskType: form.taskType,
    includeModel,
    analysisText: analysisText.trim(),
    productViewImages: await toAnalyzeImages(productImages),
    visualDataUrl,
    ...(includeModel ? { modelImages } : {}),
  };
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

/** 组装分析请求体：仅产品图与资料，对齐商业分析左栏 */
export async function toAnalyzePayload(
  images: ProductImageItem[],
  documents: ProductDocItem[],
): Promise<BusinessAnalysisAnalyzeRequest> {
  return {
    images: await toAnalyzeImages(images),
    ...(documents.length > 0 ? { documents: await toAnalyzeDocuments(documents) } : {}),
  };
}

/** 向指定任务类型追加一个 pending 批次，不影响其他类型和既有结果 */
export function appendPendingDesignImages(
  current: DesignResultGroups,
  taskType: EcommerceTaskType,
  count: number,
  aspectRatio: string,
): DesignResultGroups {
  const images = current[taskType] ?? [];
  return {
    ...current,
    [taskType]: [...images, ...pendingImagesFromCount(count, images.length, aspectRatio)],
  };
}

/** 将一条流式生图事件写入指定任务类型的当前批次 */
export function applyDesignGenerateEvent(
  current: DesignResultGroups,
  taskType: EcommerceTaskType,
  event: StudioGenerateImageEvent,
  batchStartIndex: number,
): DesignResultGroups {
  return {
    ...current,
    [taskType]: applyGenerateEvent(current[taskType] ?? [], event, batchStartIndex),
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
  stepKey: EcommerceStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<EcommerceTaskStepRecord>(
    `/api/studio/ecommerce/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: ECOMMERCE_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 删除已失效的下游步骤快照。 */
export async function deleteStudioStep(taskId: string, stepKey: EcommerceStepKey): Promise<void> {
  await apiDelete(`/api/studio/ecommerce/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`);
}

/** 再次进入流程时停在第一步：海报停在主视觉，其余有分析正文则视为已完成分析。 */
export function resolveInitialStudioPhase(
  analysis: AnalysisStepSnapshot | undefined,
  isPoster = false,
): StudioPhase {
  if (isPoster) return 'visual';
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

/** 从未知 JSON 中读取营销主视觉快照。 */
export function readVisualStepSnapshot(value: unknown): VisualStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<VisualStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.visualImages)) return undefined;
  return {
    form: snapshot.form,
    visualImages: snapshot.visualImages,
    selectedVisualIndex:
      typeof snapshot.selectedVisualIndex === 'number' ? snapshot.selectedVisualIndex : null,
    images: Array.isArray(snapshot.images) ? snapshot.images : undefined,
    documents: Array.isArray(snapshot.documents) ? snapshot.documents : undefined,
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : undefined,
  };
}

/** 构造营销主视觉步骤快照，海报含精修图与分析文件。 */
export async function createVisualStepSnapshot(
  form: StudioFormState,
  visualImages: StudioResultImage[],
  selectedVisualIndex: number | null,
  images: ProductImageItem[],
  documents: ProductDocItem[],
  analysisText: string,
): Promise<VisualStepSnapshot> {
  return {
    form,
    visualImages,
    selectedVisualIndex,
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    documents: (await Promise.all(documents.map(serializeUploadItem))) as ProductDocItem[],
    analysisText,
  };
}

/** 从未知 JSON 中读取视觉设计快照。历史表单可能仍写 designType / referenceVisual，读入时丢弃。 */
export function readDesignStepSnapshot(value: unknown): DesignStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<DesignStepSnapshot> & {
    form?: DesignFormState & { designType?: EcommerceTaskType; referenceVisual?: boolean };
  };
  if (!snapshot.form || !snapshot.designResultGroups) return undefined;
  const { designType, ...formRest } = snapshot.form;
  delete (formRest as { referenceVisual?: boolean }).referenceVisual;
  return {
    form: {
      ...formRest,
      taskType: snapshot.form.taskType ?? designType ?? '主图',
    },
    designResultGroups: snapshot.designResultGroups,
    modelImages: Array.isArray(snapshot.modelImages) ? snapshot.modelImages : [],
  };
}

/** 构造视觉设计步骤的完整持久化快照，含可选模特形象。 */
export async function createDesignStepSnapshot(
  form: DesignFormState,
  designResultGroups: DesignResultGroups,
  modelImages: ProductImageItem[],
): Promise<DesignStepSnapshot> {
  return {
    form,
    designResultGroups,
    modelImages: (await Promise.all(modelImages.map(serializeUploadItem))) as ProductImageItem[],
  };
}

/** 上一步：各步回退到前一步；海报主视觉为第一步，不再回到分析。 */
export function phaseAfterPrev(phase: StudioPhase, isPoster = false): StudioPhase {
  if (phase === 'analyzing') return 'input';
  if (phase === 'visual' || phase === 'visualGenerating') return isPoster ? 'visual' : 'analyzed';
  if (phase === 'design' || phase === 'designGenerating') return 'visual';
  if (phase === 'complete') return 'design';
  return phase;
}

/** 下一步：分析完成后依次进入营销主视觉、视觉设计与完成页 */
export function phaseAfterNext(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzed') return 'visual';
  if (phase === 'visual') return 'design';
  if (phase === 'design') return 'complete';
  return phase;
}
