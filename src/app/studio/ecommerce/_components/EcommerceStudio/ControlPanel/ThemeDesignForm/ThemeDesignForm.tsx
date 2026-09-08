import StudioImageUpload from '@/business-components/StudioImageUpload';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import GenerateForm from '../GenerateForm';
import { patchFormState } from '../utils';
import type { DesignFormState, ProductImageItem, StudioSpecFields } from '../../types';
import SelectedPlanCards from './SelectedPlanCards';
import styles from './ThemeDesignForm.module.css';

type ThemeDesignFormProps = {
  form: DesignFormState;
  images: ProductImageItem[];
  selectedCards: ThemePlanCard[];
  disabled: boolean;
  onFormChange: (next: DesignFormState) => void;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
};

/**
 * 主题出图表单：精修图、已选主题卡片与出图规格。主图与详情图共用。
 */
export default function ThemeDesignForm({
  form,
  images,
  selectedCards,
  disabled,
  onFormChange,
  onImagesAppend,
  onImageRemove,
}: ThemeDesignFormProps) {
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
