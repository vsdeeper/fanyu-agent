import ProductUpload from '@/business-components/ProductUpload';
import { MAX_MODEL_IMAGES, MODEL_UPLOAD_HINT, MODEL_UPLOAD_SUBTITLE } from '../../constants';
import type { ProductImageItem } from '../../types';

type ModelUploadProps = {
  images: ProductImageItem[];
  disabled?: boolean;
  onAppend: (files: File[]) => void;
  onRemove: (uid: string) => void;
};

/**
 * 模特形象本地上传：非必须，交互与产品图一致。
 */
export default function ModelUpload({ images, disabled, onAppend, onRemove }: ModelUploadProps) {
  return (
    <ProductUpload
      images={images}
      disabled={disabled}
      onAppend={onAppend}
      onRemove={onRemove}
      max={MAX_MODEL_IMAGES}
      label="模特形象"
      subtitle={MODEL_UPLOAD_SUBTITLE}
      hint={MODEL_UPLOAD_HINT}
      ariaLabel="上传模特形象"
    />
  );
}
