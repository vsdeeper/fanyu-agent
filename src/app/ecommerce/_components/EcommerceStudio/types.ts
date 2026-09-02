export type DesignType = 'main' | 'detail' | 'ad';

export type ProductImageItem = {
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
