import type { StudioResultImage } from '@/app/studio/_utils/result-images';

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

/** 结果图与工作室共用同一份定义（身份、状态、选中语义都在 result-images 里） */
export type ResultImage = StudioResultImage;

/** 产品模特步骤持久化快照：含源商品图/模特图（file 已剥离、previewUrl 为站内资产/数据 URL）。 */
export type ProductModelStepSnapshot = {
  form: ProductModelFormState;
  productImages: ProductImageItem[];
  modelImages: ProductImageItem[];
  results: ResultImage[];
};
