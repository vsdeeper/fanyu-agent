import { Input } from 'antd';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import GenerateForm from '../GenerateForm';
import { patchFormState } from '../utils';
import type {
  DesignFormState,
  ProductDocItem,
  ProductImageItem,
  StudioSpecFields,
} from '../../types';
import styles from './MainImageForm.module.css';

type MainImageFormProps = {
  form: DesignFormState;
  images: ProductImageItem[];
  documents: ProductDocItem[];
  disabled: boolean;
  onFormChange: (next: DesignFormState) => void;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
};

/**
 * 主图设计表单：精修图、商业分析、生成要求与出图规格。
 */
export default function MainImageForm({
  form,
  images,
  documents,
  disabled,
  onFormChange,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
}: MainImageFormProps) {
  const handleSpecChange = (next: StudioSpecFields) => {
    onFormChange({ ...form, ...next });
  };

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
        max={1}
        label="商业分析"
        hint="上传商业分析 TXT / MD"
        ariaLabel="上传商业分析"
        onAppend={onDocsAppend}
        onRemove={onDocRemove}
      />
      <label className={styles.field}>
        <span className={styles.label}>生成要求</span>
        <Input.TextArea
          value={form.requirement ?? ''}
          disabled={disabled}
          autoSize={{ minRows: 5, maxRows: 10 }}
          onChange={(event) =>
            onFormChange(patchFormState(form, 'requirement', event.target.value))
          }
        />
      </label>
      <GenerateForm
        form={form}
        disabled={disabled}
        onFormChange={handleSpecChange}
        count={form.count}
        onCountChange={(value) => onFormChange(patchFormState(form, 'count', value))}
      />
    </>
  );
}
