import type { GenerateSpecFields } from '@/app/studio/_utils/model-options';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';

export type ProductModelPhase = 'model' | 'modelGenerating' | 'complete';

/** 上传项与本地文件生命周期共用同一份定义，见 lib/shared/client/upload-items。 */
export type ProductImageItem = StudioImageUploadItem;

export type ProductModelFormState = {
  viewRequirement: string;
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
};

/** 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应，出图规格挂在 spec 上。 */
export type ProductModelPanelValues = {
  productImages: ProductImageItem[];
  modelImages: ProductImageItem[];
  viewRequirement: string;
  spec: GenerateSpecFields;
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
