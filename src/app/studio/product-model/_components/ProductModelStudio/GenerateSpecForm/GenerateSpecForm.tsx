import GenerateSpecForm, {
  type GenerateSpecFormFields,
} from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../constants';

type ProductGenerateSpecFormProps = {
  value?: GenerateSpecFormFields;
  onChange?: (next: GenerateSpecFormFields) => void;
};

/** 产品模特规格：模型、比例、清晰度与生成数量。 */
export default function ProductModelGenerateSpecForm({
  value,
  onChange,
}: ProductGenerateSpecFormProps) {
  return (
    <GenerateSpecForm
      value={value}
      onChange={onChange}
      modelOptions={MODEL_OPTIONS}
      aspectRatioOptions={ASPECT_RATIO_OPTIONS}
    />
  );
}
