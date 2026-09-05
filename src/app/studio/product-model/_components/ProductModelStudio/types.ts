export type ProductImageItem = {
  uid: string;
  file: File;
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
