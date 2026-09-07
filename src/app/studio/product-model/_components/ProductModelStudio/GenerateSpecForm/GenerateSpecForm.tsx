import GenerateSpecForm from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../constants';
import type { ProductModelFormState } from '../types';

type ProductGenerateSpecFormProps = {
  form: ProductModelFormState;
  disabled: boolean;
  onChange: (next: ProductModelFormState) => void;
};

/** 产品模特规格：模型、比例、清晰度与生成数量。 */
export default function ProductModelGenerateSpecForm({
  form,
  disabled,
  onChange,
}: ProductGenerateSpecFormProps) {
  return (
    <GenerateSpecForm
      form={form}
      disabled={disabled}
      onChange={onChange}
      modelOptions={MODEL_OPTIONS}
      aspectRatioOptions={ASPECT_RATIO_OPTIONS}
    />
  );
}
