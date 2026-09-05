import type { ProductDocItem, ProductImageItem } from '../../types';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';

type AnalyzeFormProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  disabled: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
};

/**
 * 商业分析左栏表单：产品图与产品资料，不含出图参数。
 */
export default function AnalyzeForm({
  images,
  documents,
  disabled,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
}: AnalyzeFormProps) {
  return (
    <>
      <StudioImageUpload
        images={images}
        disabled={disabled}
        onAppend={onImagesAppend}
        onRemove={onImageRemove}
      />
      <ProductDocsUpload
        documents={documents}
        disabled={disabled}
        onAppend={onDocsAppend}
        onRemove={onDocRemove}
      />
    </>
  );
}
