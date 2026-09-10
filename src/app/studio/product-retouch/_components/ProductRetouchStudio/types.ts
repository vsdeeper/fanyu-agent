import type { StudioResultImage } from '@/app/studio/_utils/result-images';

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

/** 结果图与工作室共用同一份定义（身份、状态、选中语义都在 result-images 里） */
export type ResultImage = StudioResultImage;

/** 产品精修步骤持久化快照：含源商品图（file 已剥离、previewUrl 为站内资产/数据 URL）。 */
export type ProductRetouchRefineStepSnapshot = {
  form: RefineFormState;
  images: ProductImageItem[];
  results: ResultImage[];
  /** 点选为多视角输入的精修图 id */
  selectedIds: string[];
  needsMultiview: boolean;
};

/** 产品多视角步骤持久化快照。 */
export type ProductRetouchMultiviewStepSnapshot = {
  form: MultiviewFormState;
  results: ResultImage[];
};
