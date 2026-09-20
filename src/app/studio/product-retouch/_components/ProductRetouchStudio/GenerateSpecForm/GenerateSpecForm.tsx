import GenerateSpecForm, {
  type GenerateSpecFormFields,
} from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../constants';

type ProductGenerateSpecFormProps = {
  value?: GenerateSpecFormFields;
  onChange?: (next: GenerateSpecFormFields) => void;
};

/** 产品精修规格：模型、比例与清晰度；精修按产品图张数逐张出图，故不展示生成数量。 */
export default function ProductRetouchGenerateSpecForm({
  value,
  onChange,
}: ProductGenerateSpecFormProps) {
  return (
    <GenerateSpecForm
      value={value}
      onChange={onChange}
      modelOptions={MODEL_OPTIONS}
      aspectRatioOptions={ASPECT_RATIO_OPTIONS}
      showCount={false}
    />
  );
}
