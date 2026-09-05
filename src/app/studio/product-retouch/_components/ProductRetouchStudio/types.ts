export type ProductRetouchPhase =
  'refine' | 'refineGenerating' | 'multiview' | 'multiviewGenerating' | 'complete';

export type ProductImageItem = {
  uid: string;
  file?: File;
  previewUrl: string;
};

export type GenerateSpecFields = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
};

export type RefineFormState = GenerateSpecFields & {
  requirement: string;
};

export type MultiviewFormState = GenerateSpecFields & {
  requirement: string;
};

export type ResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};

/** 产品精修步骤持久化快照：含源商品图（file 已剥离、previewUrl 为站内资产/数据 URL）。 */
export type ProductRetouchRefineStepSnapshot = {
  form: RefineFormState;
  images: ProductImageItem[];
  results: ResultImage[];
  selectedIndex: number | null;
  needsMultiview: boolean;
};

/** 产品多视角步骤持久化快照。 */
export type ProductRetouchMultiviewStepSnapshot = {
  form: MultiviewFormState;
  results: ResultImage[];
};
