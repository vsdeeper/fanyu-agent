import GenerateSpecForm from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../constants';
import type { GenerateSpecFields } from '../types';

type ProductGenerateSpecFormProps = {
  form: GenerateSpecFields;
  disabled: boolean;
  onChange: (next: GenerateSpecFields) => void;
};

/** 产品精修规格：模型、比例、清晰度与生成数量。 */
export default function ProductRetouchGenerateSpecForm({
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
