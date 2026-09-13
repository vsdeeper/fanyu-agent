import StudioImageUpload from '@/business-components/StudioImageUpload';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import GenerateForm from '../GenerateForm';
import { patchFormState } from '../utils';
import type { DesignFormState, ProductImageItem, StudioSpecFields } from '../../types';
import { PRODUCT_IMAGE_HINT, PRODUCT_IMAGE_LABEL, PRODUCT_IMAGE_SUBTITLE } from './constants';
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
 *
 * 两种任务的产品精修图都非必填，所以副标题与提示恒为「可选」口径 ——
 * 本组件只由主题规划类任务渲染，不用再按 taskType 分支。
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
        label={PRODUCT_IMAGE_LABEL}
        subtitle={PRODUCT_IMAGE_SUBTITLE}
        hint={PRODUCT_IMAGE_HINT}
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
