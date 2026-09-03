export type StudioPhase =
  | 'input'
  | 'analyzing'
  | 'analyzed'
  | 'visual'
  | 'visualGenerating'
  | 'model'
  | 'modelGenerating'
  | 'done';

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

/** 生图规格字段，主视觉与产品模特表单共用 */
export type StudioSpecFields = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

export type StudioFormState = StudioSpecFields & {
  count: string;
};

export type ModelFormState = StudioSpecFields & {
  modelRequirement: string;
};

export type StudioResultImage = {
  index: number;
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  error?: string;
};
