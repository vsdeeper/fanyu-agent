import type {
  BusinessAnalysisDocumentInput,
  BusinessAnalysisImageInput,
} from '@/app/api/studio/business-analysis/_shared/types';
import type {
  StudioGenerateImageEvent,
  StudioGenerateRequest,
} from '@/app/api/studio/_shared/generate-types';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import {
  ECOMMERCE_STEP_SNAPSHOT_VERSION,
  ECOMMERCE_TASK_TYPES,
} from '@/app/api/studio/ecommerce/_shared/task-constants';
import type {
  EcommerceStepKey,
  EcommerceTaskStepRecord,
  EcommerceTaskType,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import { MAX_PRODUCT_DOCS } from '@/business-components/ProductDocsUpload/constants';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { apiPut } from '@/lib/shared/client/api-client';
import {
  applyGenerateEvent,
  pendingImages as pendingImagesFromCount,
} from '@/app/studio/_utils/generate-stream';
import {
  appendUploadItems,
  readUploadItemAsDataUrl,
  readUploadItemAsText,
  removeUploadItem,
  revokeUploadItemUrls,
  serializeUploadItem,
} from '@/app/studio/_utils/upload-items';
import {
  getGeneratedImages,
  keepExistingImageIds,
  normalizeResultImages,
  pickExistingImageId,
} from '@/app/studio/_utils/result-images';
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
import { DEFAULT_CLARITY_BY_TASK_TYPE, DEFAULT_DESIGN_FORM_STATE } from './constants';

export {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  isAbortError,
  pendingImages as pendingImagesFromCount,
} from '@/app/studio/_utils/generate-stream';
export { consumeAnalyzeSse, createRafTextBuffer } from '@/app/studio/_utils/analyze-stream';
export type { RafTextBuffer } from '@/app/studio/_utils/analyze-stream';
export {
  getGeneratedImages,
  getSelectedImageUrl as getSelectedResultImageUrl,
} from '@/app/studio/_utils/result-images';
export {
  readFileAsDataUrl,
  readUrlAsDataUrl,
  readUploadItemAsDataUrl,
} from '@/app/studio/_utils/upload-items';

/** 按任务类型给出设计表单默认值（主图/详情图清晰度 1K，海报 2K；详情图默认 3:4）。 */
export function createDefaultDesignForm(taskType: EcommerceTaskType): DesignFormState {
  return {
    ...DEFAULT_DESIGN_FORM_STATE,
    taskType,
    clarity: DEFAULT_CLARITY_BY_TASK_TYPE[taskType],
    ...(taskType === '详情图' ? { aspectRatio: '3:4' } : {}),
  };
}

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

/** 读取上传的商业分析 txt/md 正文，多份以空行拼接。 */
export async function readProductDocsAsText(documents: ProductDocItem[]): Promise<string> {
  const texts = await Promise.all(documents.map((item) => readUploadItemAsText(item)));
  return texts
    .map((text) => text.trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * 主图请求体：规格 + 商业分析 + 可选产品资料正文 + 选中主题文案 + 产品精修图 + 可选文案标准参考图。
 *
 * 与 toDetailImageGeneratePayload 的参数顺序不同：这里把两个可选 string 都排在最后，且参考图排在产品资料之后。
 * 两个可选参数类型相同，插入中间不会报类型错、只会静默传错值，故一律追加在末尾。
 */
export async function toMainImageGeneratePayload(
  form: DesignFormState,
  analysisText: string,
  requirements: ThemePlanCard[],
  productImages: ProductImageItem[],
  productDocumentsText?: string,
  copyStyleReferenceDataUrl?: string,
): Promise<StudioGenerateRequest> {
  return {
    kind: 'mainImage',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    analysisText: analysisText.trim(),
    requirements: requirements.map((card) => ({
      themeId: card.themeId,
      title: card.title,
      requirement: card.requirement.trim(),
    })),
    productViewImages: await toAnalyzeImages(productImages),
    ...(productDocumentsText?.trim() ? { productDocumentsText: productDocumentsText.trim() } : {}),
    ...(copyStyleReferenceDataUrl ? { copyStyleReferenceDataUrl } : {}),
  };
}

/** 详情图请求体：规格 + 商业分析 + 可选产品资料正文 + 当前屏主题卡 + 产品精修图 + 可选上一屏 */
export async function toDetailImageGeneratePayload(
  form: DesignFormState,
  analysisText: string,
  requirements: ThemePlanCard[],
  productImages: ProductImageItem[],
  previousScreenDataUrl?: string,
  productDocumentsText?: string,
): Promise<StudioGenerateRequest> {
  return {
    kind: 'detailImage',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    analysisText: analysisText.trim(),
    requirements: requirements.map((card) => ({
      themeId: card.themeId,
      title: card.title,
      requirement: card.requirement.trim(),
    })),
    productViewImages: await toAnalyzeImages(productImages),
    ...(previousScreenDataUrl ? { previousScreenDataUrl } : {}),
    ...(productDocumentsText?.trim() ? { productDocumentsText: productDocumentsText.trim() } : {}),
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

/** 组装主题规划分析请求体：商业分析文档 + 可选补充产品资料（主图） */
export async function toThemeAnalyzePayload(
  documents: ProductDocItem[],
  kind: 'mainImage' | 'detailImage' = 'mainImage',
  productDocs: ProductDocItem[] = [],
): Promise<{
  kind: 'mainImage' | 'detailImage';
  documents: BusinessAnalysisDocumentInput[];
  productDocuments?: BusinessAnalysisDocumentInput[];
}> {
  return {
    kind,
    documents: await toAnalyzeDocuments(documents),
    ...(productDocs.length > 0 ? { productDocuments: await toAnalyzeDocuments(productDocs) } : {}),
  };
}

/**
 * 向主题出图结果追加「主题 × 数量」的 pending 槽位，带上 themeId / themeTitle。
 *
 * 槽位顺序即 `buildGeneratePlan` 的位置序（`generate-plan.ts` 同样按「先主题、后数量」两层展开），
 * 服务端作业按这个顺序把每张图回传给对应槽位；改动展开顺序必须两处同步，否则图会挂到别的主题上。
 * 返回本批槽位，调用方直接拿它建作业，不再靠起始下标反推。
 */
export function appendPendingThemeImages(
  current: DesignResultGroups,
  taskType: EcommerceTaskType,
  requirements: readonly { themeId: string; title: string }[],
  count: number,
  aspectRatio: string,
): { groups: DesignResultGroups; slots: StudioResultImage[] } {
  const images = current[taskType] ?? [];
  const slots: StudioResultImage[] = requirements.flatMap((item) =>
    Array.from({ length: Math.max(1, count) }, () => ({
      id: crypto.randomUUID(),
      aspectRatio,
      status: 'pending' as const,
      themeId: item.themeId,
      themeTitle: item.title,
    })),
  );
  return { groups: { ...current, [taskType]: [...images, ...slots] }, slots };
}

/** 向主图结果追加「主题 × 数量」的 pending 槽位，带上 themeId / themeTitle。 */
export function appendPendingMainImageImages(
  current: DesignResultGroups,
  requirements: readonly { themeId: string; title: string }[],
  count: number,
  aspectRatio: string,
): { groups: DesignResultGroups; slots: StudioResultImage[] } {
  return appendPendingThemeImages(current, '主图', requirements, count, aspectRatio);
}

/** 向指定任务类型追加一个 pending 批次，不影响其他类型和既有结果 */
export function appendPendingDesignImages(
  current: DesignResultGroups,
  taskType: EcommerceTaskType,
  count: number,
  aspectRatio: string,
): { groups: DesignResultGroups; slots: StudioResultImage[] } {
  const images = current[taskType] ?? [];
  const slots = pendingImagesFromCount(count, aspectRatio);
  return { groups: { ...current, [taskType]: [...images, ...slots] }, slots };
}

/** 将一条生图事件写入指定任务类型中对应的槽位 */
export function applyDesignGenerateEvent(
  current: DesignResultGroups,
  taskType: EcommerceTaskType,
  event: StudioGenerateImageEvent,
): DesignResultGroups {
  return {
    ...current,
    [taskType]: applyGenerateEvent(current[taskType] ?? [], event),
  };
}

/** 只保留各任务类型中生成成功且有地址的图片。 */
export function getGeneratedDesignGroups(groups: DesignResultGroups): DesignResultGroups {
  const generated: DesignResultGroups = {};
  for (const taskType of ECOMMERCE_TASK_TYPES) {
    const images = getGeneratedImages(groups[taskType] ?? []);
    if (images.length > 0) generated[taskType] = images;
  }
  return generated;
}

/** 构造商业分析步骤的完整持久化快照。 */
export async function createAnalysisStepSnapshot(
  images: ProductImageItem[],
  documents: ProductDocItem[],
  analysisText: string,
  extras?: {
    planCards?: ThemePlanCard[];
    selectedThemeIds?: string[];
    productDocs?: ProductDocItem[];
  },
): Promise<AnalysisStepSnapshot> {
  return {
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    documents: (await Promise.all(documents.map(serializeUploadItem))) as ProductDocItem[],
    analysisText,
    ...(extras?.planCards ? { planCards: extras.planCards } : {}),
    ...(extras?.selectedThemeIds ? { selectedThemeIds: extras.selectedThemeIds } : {}),
    ...(extras?.productDocs
      ? {
          productDocs: (await Promise.all(
            extras.productDocs.map(serializeUploadItem),
          )) as ProductDocItem[],
        }
      : {}),
  };
}

/**
 * 比较两份可序列化步骤快照是否相同；无基线视为已变化。
 *
 * 不可直接用 JSON.stringify 比较：read*StepSnapshot 与 create*StepSnapshot 输出同一批键但顺序不同
 * （如 design 的 referenceImageId 在 create 里排在 images 之前、在 read 里排在之后），
 * 顺序敏感的字符串比较会把「首次进入、什么都没改」也判成已变化，白白打一次保存。
 */
export function isSameStepSnapshot(next: unknown, baseline: unknown): boolean {
  if (baseline === undefined) return false;
  return stableStringify(next) === stableStringify(baseline);
}

/** 与 JSON.stringify 同语义，但对象键先排序再序列化；数组保持原序（结果图的先后是有意义的）。 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, (item as Record<string, unknown>)[key]]),
        )
      : item,
  );
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

/**
 * 再次进入流程时停在第一步：主题规划类有分析则停分析完成，仅有旧设计快照则停设计；海报停主视觉。
 *
 * 两类任务必居其一（见 `isThemePlanTask` / `isPosterTask`），都不匹配说明 taskType 非法，直接抛错而不是猜一个步骤。
 */
export function resolveInitialStudioPhase(
  analysis: AnalysisStepSnapshot | undefined,
  isPoster = false,
  isThemePlan = false,
  hasDesignSnapshot = false,
): StudioPhase {
  if (isThemePlan) {
    const hasPlan =
      (analysis?.planCards?.length ?? 0) > 0 || Boolean(analysis?.analysisText?.trim());
    if (hasPlan) return 'analyzed';
    if (hasDesignSnapshot) return 'design';
    return 'input';
  }
  if (isPoster) return 'visual';
  throw new Error('电商任务类型既非主题规划类也非营销海报，无法确定初始步骤');
}

/** 从未知 JSON 中读取商业分析快照。 */
export function readAnalysisStepSnapshot(value: unknown): AnalysisStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<AnalysisStepSnapshot>;
  if (!Array.isArray(snapshot.images) || !Array.isArray(snapshot.documents)) return undefined;
  return {
    images: snapshot.images,
    documents: snapshot.documents,
    productDocs: Array.isArray(snapshot.productDocs) ? snapshot.productDocs : undefined,
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : '',
    planCards: Array.isArray(snapshot.planCards) ? snapshot.planCards : undefined,
    selectedThemeIds: Array.isArray(snapshot.selectedThemeIds)
      ? snapshot.selectedThemeIds.filter((id): id is string => typeof id === 'string')
      : undefined,
  };
}

/** 从未知 JSON 中读取营销主视觉快照；选中态只认 id，旧快照的数字下标读不出即视为未选中。 */
export function readVisualStepSnapshot(value: unknown): VisualStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<VisualStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.visualImages)) return undefined;
  const visualImages = normalizeResultImages(snapshot.visualImages);
  return {
    form: snapshot.form,
    visualImages,
    selectedVisualId: pickExistingImageId(visualImages, snapshot.selectedVisualId),
    images: Array.isArray(snapshot.images) ? snapshot.images : undefined,
    documents: Array.isArray(snapshot.documents) ? snapshot.documents : undefined,
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : undefined,
  };
}

/** 构造营销主视觉步骤快照，海报含精修图与分析文件。 */
export async function createVisualStepSnapshot(
  form: StudioFormState,
  visualImages: StudioResultImage[],
  selectedVisualId: string | null,
  images: ProductImageItem[],
  documents: ProductDocItem[],
  analysisText: string,
): Promise<VisualStepSnapshot> {
  return {
    form,
    visualImages,
    selectedVisualId,
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
  delete (formRest as { requirement?: string }).requirement;
  const form: DesignFormState = {
    ...formRest,
    taskType: snapshot.form.taskType ?? designType ?? '主图',
  };
  const designResultGroups: DesignResultGroups = {};
  for (const taskType of ECOMMERCE_TASK_TYPES) {
    const images = snapshot.designResultGroups[taskType];
    if (images) designResultGroups[taskType] = normalizeResultImages(images);
  }
  // 两个选中态分属不同分组：参考图在本任务类型的分组里，导出点选恒在详情图分组里
  const referenceGroup = designResultGroups[form.taskType] ?? [];
  const exportGroup = designResultGroups['详情图'] ?? [];
  return {
    form,
    designResultGroups,
    modelImages: Array.isArray(snapshot.modelImages) ? snapshot.modelImages : [],
    images: Array.isArray(snapshot.images) ? snapshot.images : undefined,
    documents: Array.isArray(snapshot.documents) ? snapshot.documents : undefined,
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : undefined,
    referenceImageId: pickExistingImageId(referenceGroup, snapshot.referenceImageId),
    selectedExportIds: Array.isArray(snapshot.selectedExportIds)
      ? keepExistingImageIds(
          exportGroup,
          snapshot.selectedExportIds.filter((id): id is string => typeof id === 'string'),
        )
      : undefined,
  };
}

/** 构造视觉设计步骤的完整持久化快照；主题规划类另含精修图。 */
export async function createDesignStepSnapshot(
  form: DesignFormState,
  designResultGroups: DesignResultGroups,
  modelImages: ProductImageItem[],
  extras?: {
    images?: ProductImageItem[];
    documents?: ProductDocItem[];
    analysisText?: string;
    referenceImageId?: string | null;
    selectedExportIds?: string[];
  },
): Promise<DesignStepSnapshot> {
  return {
    form,
    designResultGroups,
    modelImages: (await Promise.all(modelImages.map(serializeUploadItem))) as ProductImageItem[],
    ...(typeof extras?.referenceImageId === 'string' || extras?.referenceImageId === null
      ? { referenceImageId: extras.referenceImageId }
      : {}),
    ...(Array.isArray(extras?.selectedExportIds)
      ? { selectedExportIds: extras.selectedExportIds }
      : {}),
    ...(extras?.images
      ? {
          images: (await Promise.all(extras.images.map(serializeUploadItem))) as ProductImageItem[],
        }
      : {}),
    ...(extras?.documents
      ? {
          documents: (await Promise.all(
            extras.documents.map(serializeUploadItem),
          )) as ProductDocItem[],
        }
      : {}),
    ...(typeof extras?.analysisText === 'string' ? { analysisText: extras.analysisText } : {}),
  };
}

/** 上一步：各步回退到前一步；主题规划类设计回分析，海报主视觉为第一步。 */
export function phaseAfterPrev(
  phase: StudioPhase,
  isPoster = false,
  isThemePlan = false,
): StudioPhase {
  if (isThemePlan) {
    if (phase === 'analyzing') return 'input';
    if (phase === 'design' || phase === 'designGenerating') return 'analyzed';
    if (phase === 'complete') return 'design';
    return phase;
  }
  if (phase === 'analyzing') return 'input';
  if (phase === 'visual' || phase === 'visualGenerating') return isPoster ? 'visual' : 'analyzed';
  if (phase === 'design' || phase === 'designGenerating') return 'visual';
  if (phase === 'complete') return 'design';
  return phase;
}

/** 下一步：分析完成后进入主视觉或主题设计，再进入完成页 */
export function phaseAfterNext(phase: StudioPhase, isThemePlan = false): StudioPhase {
  if (phase === 'analyzed') return isThemePlan ? 'design' : 'visual';
  if (phase === 'visual') return 'design';
  if (phase === 'design') return 'complete';
  return phase;
}
