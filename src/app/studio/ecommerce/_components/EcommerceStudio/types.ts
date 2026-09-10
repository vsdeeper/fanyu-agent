import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';

export type { StudioResultImage };

export type StudioPhase =
  | 'input'
  | 'analyzing'
  | 'analyzed'
  | 'visual'
  | 'visualGenerating'
  | 'design'
  | 'designGenerating'
  | 'complete';

export type ProductImageItem = {
  uid: string;
  file?: File;
  previewUrl: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ProductDocItem = {
  uid: string;
  file?: File;
  previewUrl: string;
  name: string;
  mimeType: string;
  size: number;
};

/** 生图规格字段，主视觉与产品模特表单共用 */
export type StudioSpecFields = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

export type StudioFormState = StudioSpecFields & {
  count: string;
};

export type DesignFormState = StudioFormState & {
  taskType: EcommerceTaskType;
};

export type DesignResultGroups = Partial<Record<EcommerceTaskType, StudioResultImage[]>>;

export type AnalysisStepSnapshot = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  /** 主图 / 详情图任务的补充产品资料（TXT / MD）；documents 恒为商业分析文档，两组不可混用 */
  productDocs?: ProductDocItem[];
  analysisText: string;
  planCards?: ThemePlanCard[];
  selectedThemeIds?: string[];
};

export type VisualStepSnapshot = {
  form: StudioFormState;
  visualImages: StudioResultImage[];
  selectedVisualId: string | null;
  images?: ProductImageItem[];
  documents?: ProductDocItem[];
  analysisText?: string;
};

export type DesignStepSnapshot = {
  form: DesignFormState;
  designResultGroups: DesignResultGroups;
  modelImages: ProductImageItem[];
  images?: ProductImageItem[];
  documents?: ProductDocItem[];
  analysisText?: string;
  /**
   * 右栏结果网格里点选的参考图**在本任务类型对应分组**中的图片 id，至多一张：
   * 详情图 = designResultGroups['详情图'] 的上一屏；主图 = designResultGroups['主图'] 的文案标准参考图。
   * 同一任务只会是其中一种（designForm.taskType 被强制覆写为 task.taskType），故共用一个字段。
   * 若将来主图步需同时持有两种角色的参考图、或需多选，必须拆字段并把本字段改名为 previousScreenId。
   */
  referenceImageId?: string | null;
  /** 完成页点选待导出的详情图 id；每主题至多一张，顺序即导出顺序 */
  selectedExportIds?: string[];
};
