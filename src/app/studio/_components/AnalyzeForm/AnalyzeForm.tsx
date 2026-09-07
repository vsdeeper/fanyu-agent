import type { ProductDocUploadItem } from '@/business-components/ProductDocsUpload/types';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload/types';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';

type AnalyzeFormProps = {
  images: StudioImageUploadItem[];
  documents: ProductDocUploadItem[];
  disabled: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
};

/**
 * 商业分析左栏表单：产品精修图与产品资料，不含出图参数。
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
        label="产品精修图"
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
