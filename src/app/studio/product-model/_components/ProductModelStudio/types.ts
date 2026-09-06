export type ProductModelPhase = 'model' | 'modelGenerating' | 'complete';

export type ProductImageItem = {
  uid: string;
  file?: File;
  previewUrl: string;
};

export type ProductModelFormState = {
  viewRequirement: string;
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
};

export type ResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};

/** 产品模特步骤持久化快照：含源商品图/模特图（file 已剥离、previewUrl 为站内资产/数据 URL）。 */
export type ProductModelStepSnapshot = {
  form: ProductModelFormState;
  productImages: ProductImageItem[];
  modelImages: ProductImageItem[];
  results: ResultImage[];
};
