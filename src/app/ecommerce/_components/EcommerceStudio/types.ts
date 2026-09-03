export type DesignType = 'main' | 'detail' | 'ad';

export type StudioPhase = 'input' | 'analyzing' | 'analyzed' | 'confirm' | 'generating' | 'done';

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

export type StudioFormState = {
  designType: DesignType;
  platform: string;
  requirement: string;
  language: string;
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
};

export type StudioResultImage = {
  index: number;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};
