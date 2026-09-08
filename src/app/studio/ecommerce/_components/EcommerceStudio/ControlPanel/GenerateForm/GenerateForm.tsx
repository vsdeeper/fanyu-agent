import GenerateSpecForm from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../../constants';
import type { StudioFormState, StudioSpecFields } from '../../types';
import { dispatchSpecFormChange } from './utils';

type GenerateFormProps = {
  form: StudioSpecFields;
  disabled: boolean;
  onFormChange: (next: StudioSpecFields) => void;
  count?: string;
  onCountChange?: (value: string) => void;
};

/**
 * 出图规格：模型、尺寸比例、清晰度；传入 count 时另显生成数量。
 */
export default function GenerateForm({
  form,
  disabled,
  onFormChange,
  count,
  onCountChange,
}: GenerateFormProps) {
  const specForm: StudioFormState = {
    ...form,
    count: count ?? '1',
  };
  return (
    <GenerateSpecForm
      form={specForm}
      disabled={disabled}
      onChange={(next) => dispatchSpecFormChange(next, count, onFormChange, onCountChange)}
      modelOptions={MODEL_OPTIONS}
      aspectRatioOptions={ASPECT_RATIO_OPTIONS}
      showCount={count !== undefined}
    />
  );
}
