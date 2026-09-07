import StudioImageUpload from '@/business-components/StudioImageUpload';
import type { MainImagePlanCard } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import GenerateForm from '../GenerateForm';
import { patchFormState } from '../utils';
import type { DesignFormState, ProductImageItem, StudioSpecFields } from '../../types';
import SelectedPlanCards from './SelectedPlanCards';
import styles from './MainImageForm.module.css';

type MainImageFormProps = {
  form: DesignFormState;
  images: ProductImageItem[];
  selectedCards: MainImagePlanCard[];
  disabled: boolean;
  onFormChange: (next: DesignFormState) => void;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
};

/**
 * 主图设计表单：精修图、已选主题卡片与出图规格。
 */
export default function MainImageForm({
  form,
  images,
  selectedCards,
  disabled,
  onFormChange,
  onImagesAppend,
  onImageRemove,
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
      {selectedCards.length > 0 ? (
        <div className={styles.field}>
          <span className={styles.label}>已选主题</span>
          <SelectedPlanCards cards={selectedCards} />
        </div>
      ) : null}
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
