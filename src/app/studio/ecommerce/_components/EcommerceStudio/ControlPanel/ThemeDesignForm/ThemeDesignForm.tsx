import { Form, Radio } from 'antd';
import StudioImageUpload from '@/app/studio/_components/StudioImageUpload';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import GenerateSpecFields from '@/app/studio/_components/GenerateSpecFields';
import {
  PRODUCT_IMAGE_HINT,
  PRODUCT_IMAGE_LABEL,
  PRODUCT_IMAGE_SUBTITLE,
  TEXTLESS_VISUAL_LABEL,
  UNIFY_VISUAL_MOOD_LABEL,
  YES_NO_OPTIONS,
} from './constants';
import SelectedPlanCards from './SelectedPlanCards';
import styles from './ThemeDesignForm.module.css';

type ThemeDesignFormProps = {
  selectedCards: ThemePlanCard[];
  disabled: boolean;
};

/**
 * 主题出图表单：精修图、已选主题卡片、出图开关与规格。主图与详情图共用。
 *
 * 两种任务的产品精修图都非必填，所以副标题与提示恒为「可选」口径 ——
 * 本组件只由主题规划类任务渲染，不用再按 taskType 分支。
 *
 * 出图开关与规格字段都写成 designSpec 子路径，由 rc-field-form 按路径合并进同一对象。
 */
export default function ThemeDesignForm({ selectedCards, disabled }: ThemeDesignFormProps) {
  return (
    <>
      <Form.Item name="images">
        <StudioImageUpload
          label={PRODUCT_IMAGE_LABEL}
          subtitle={PRODUCT_IMAGE_SUBTITLE}
          hint={PRODUCT_IMAGE_HINT}
          disabled={disabled}
        />
      </Form.Item>
      {selectedCards.length > 0 ? (
        <div className={styles.field}>
          <span className={styles.label}>已选主题</span>
          <SelectedPlanCards cards={selectedCards} />
        </div>
      ) : null}
      <Form.Item name={['designSpec', 'textlessVisual']} label={TEXTLESS_VISUAL_LABEL}>
        <Radio.Group
          block
          optionType="button"
          buttonStyle="solid"
          options={YES_NO_OPTIONS}
          disabled={disabled}
        />
      </Form.Item>
      <Form.Item name={['designSpec', 'unifyVisualMood']} label={UNIFY_VISUAL_MOOD_LABEL}>
        <Radio.Group
          block
          optionType="button"
          buttonStyle="solid"
          options={YES_NO_OPTIONS}
          disabled={disabled}
        />
      </Form.Item>
      <GenerateSpecFields namePrefix={['designSpec']} />
    </>
  );
}
