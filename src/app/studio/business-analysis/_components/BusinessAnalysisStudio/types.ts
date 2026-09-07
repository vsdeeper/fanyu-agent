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
  analysisText: string;
};
