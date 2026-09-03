import type { ProductDocItem, ProductImageItem } from '../../types';
import ProductUpload from '../ProductUpload';
import ProductDocsUpload from './ProductDocsUpload';

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
 * 商业分析左栏表单：产品资料与产品图，不含出图参数。
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
      <ProductDocsUpload
        documents={documents}
        disabled={disabled}
        onAppend={onDocsAppend}
        onRemove={onDocRemove}
      />
      <ProductUpload
        images={images}
        disabled={disabled}
        onAppend={onImagesAppend}
        onRemove={onImageRemove}
      />
    </>
  );
}
