import type { GenerateSpecFormFields } from '@/app/studio/_components/GenerateSpecForm';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';

export type ProductRetouchPhase =
  'refine' | 'refineGenerating' | 'multiview' | 'multiviewGenerating' | 'complete';

/** 上传项与本地文件生命周期共用同一份定义，见 lib/shared/client/upload-items。 */
export type ProductImageItem = StudioImageUploadItem;

export type GenerateSpecFields = GenerateSpecFormFields;

export type RefineFormState = GenerateSpecFields & {
  requirement: string;
};

export type MultiviewFormState = GenerateSpecFields & {
  requirement: string;
};

/**
 * 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应。
 *
 * 精修与多视角各占一套 name：两分支的 aspectRatio 默认值不同（1:1 / 16:9），共用 key 会串值。
 */
export type ProductRetouchPanelValues = {
  images: ProductImageItem[];
  refineRequirement: string;
  refineSpec: GenerateSpecFields;
  needsMultiview: boolean;
  multiviewRequirement: string;
  multiviewSpec: GenerateSpecFields;
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
