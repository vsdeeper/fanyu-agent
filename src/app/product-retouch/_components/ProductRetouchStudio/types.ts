export type ProductRetouchPhase =
  'refine' | 'refineGenerating' | 'multiview' | 'multiviewGenerating';

export type ProductImageItem = {
  uid: string;
  file: File;
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

export type ResultImage = {
  index: number;
  aspectRatio: string;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};
