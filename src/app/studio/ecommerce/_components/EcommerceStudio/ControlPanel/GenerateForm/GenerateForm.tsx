import GenerateSpecForm from '@/app/studio/_components/GenerateSpecForm';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../../constants';
import type { StudioFormState } from '../../types';

type GenerateFormProps = {
  /** 受控值；未传按空规格处理（Form.Item 首帧可能注入 undefined） */
  value?: StudioFormState;
  onChange?: (next: StudioFormState) => void;
  aspectRatioLabel?: string;
};

/**
 * 出图规格：模型、尺寸比例、清晰度与生成数量。
 *
 * 设计步把它挂在 `designSpec` 上，那个值还带着 textlessVisual / unifyVisualMood 等键。
 * 这些键不会因为改规格而丢：GenerateSpecForm 每次回写的是整对象（`{ ...form, clarity }`），
 * 而 `form` 就是 Form.Item 传进来的那个完整对象，多余的键被原样带过去 —— 与本组件的类型无关，
 * 所以这里不声明泛型（声明了也只是装饰，全仓不会有人写出比约束更窄的类型参数）。
 */
export default function GenerateForm({ value, onChange, aspectRatioLabel }: GenerateFormProps) {
  return (
    <GenerateSpecForm
      value={value}
      onChange={onChange}
      modelOptions={MODEL_OPTIONS}
      aspectRatioOptions={ASPECT_RATIO_OPTIONS}
      aspectRatioLabel={aspectRatioLabel}
    />
  );
}
