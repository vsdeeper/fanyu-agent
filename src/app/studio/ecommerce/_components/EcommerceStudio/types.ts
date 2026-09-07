import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
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
  analysisText: string;
};

export type VisualStepSnapshot = {
  form: StudioFormState;
  visualImages: StudioResultImage[];
  selectedVisualIndex: number | null;
};

export type DesignStepSnapshot = {
  form: DesignFormState;
  designResultGroups: DesignResultGroups;
  modelImages: ProductImageItem[];
};
