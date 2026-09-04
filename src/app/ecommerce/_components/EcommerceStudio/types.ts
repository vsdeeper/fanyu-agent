import type { EcommerceDesignType } from '@/app/api/ecommerce/_shared/types';

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
  file: File;
  previewUrl: string;
};

export type ProductDocItem = {
  uid: string;
  file: File;
  previewUrl: string;
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
  designType: EcommerceDesignType;
  referenceVisual: boolean;
};

export type StudioResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};

export type DesignResultGroups = Partial<Record<EcommerceDesignType, StudioResultImage[]>>;
