import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';

export type StudioPhase = 'input' | 'analyzing' | 'analyzed' | 'complete';

/** 上传项与本地文件生命周期共用同一份定义，见 lib/shared/client/upload-items。 */
export type ProductImageItem = StudioImageUploadItem;
export type ProductDocItem = StudioImageUploadItem;

/** 左栏表单值：与 AnalyzeForm 的 Form.Item name 一一对应，四项皆可空。 */
export type AnalysisPanelValues = {
  images: ProductImageItem[];
  brandLogo: ProductImageItem[];
  documents: ProductDocItem[];
  productDescription: string;
};

export type AnalysisStepSnapshot = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  /** 品牌 Logo（至多一张）；为空时整个键不写 */
  brandLogoImages?: ProductImageItem[];
  /** 产品说明自由文本；为空时整个键不写 */
  productDescription?: string;
  analysisText: string;
};
