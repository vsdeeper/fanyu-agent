import { Form, Radio } from 'antd';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import GenerateForm from '../GenerateForm';
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
 * 两个出图开关写成 designSpec 的子路径，与同一个对象上的规格 Item 并存：
 * rc-field-form 写子路径时沿路径克隆，父 Item 拿到新对象引用会照常重渲染，
 * 规格整对象回写时也会把这两个键带上。
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
      <Form.Item name="designSpec">
        <GenerateForm />
      </Form.Item>
    </>
  );
}
