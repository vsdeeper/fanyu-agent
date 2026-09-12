export type StudioPhase = 'input' | 'analyzing' | 'analyzed' | 'complete';

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

export type AnalysisStepSnapshot = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  /** 品牌 Logo（至多一张）；为空时整个键不写 */
  brandLogoImages?: ProductImageItem[];
  /** 产品说明自由文本；为空时整个键不写 */
  productDescription?: string;
  analysisText: string;
};
