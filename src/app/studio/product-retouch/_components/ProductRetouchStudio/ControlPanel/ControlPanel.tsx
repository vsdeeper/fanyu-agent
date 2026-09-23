import { Button, Form, Input, Radio, type FormInstance } from 'antd';
import StudioImageUpload from '@/app/studio/_components/StudioImageUpload';
import {
  MULTIVIEW_BUTTON,
  MULTIVIEW_NEED_OPTIONS,
  NO_IMAGE_WARNING,
  REFINE_BUTTON,
  REQUIREMENT_MISSING,
} from '../constants';
import type { ProductRetouchPanelValues, ProductRetouchPhase } from '../types';
import GenerateSpecForm from '../GenerateSpecForm';
import SelectedStandards from './SelectedStandards';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<ProductRetouchPanelValues>;
  initialValues: ProductRetouchPanelValues;
  phase: ProductRetouchPhase;
  hasRefineResult: boolean;
  selectedStandardUrls: readonly string[];
  locked: boolean;
  onRefine: () => void;
  onMultiview: () => void;
};

/** 产品精修工作台左栏：按当前步骤展示输入项与主操作。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  hasRefineResult,
  selectedStandardUrls,
  locked,
  onRefine,
  onMultiview,
}: ControlPanelProps) {
  const refining = phase === 'refineGenerating';
  const multiviewGenerating = phase === 'multiviewGenerating';
  const showRefine = phase === 'refine' || refining;
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {/*
          左栏值的唯一真相是这份 Form store：两套规格共用一份 store 但各占独立 name，
          切步骤时未渲染的那批 Form.Item 只是取消注册，值仍保留（preserve 默认 true），
          故读值一律用 getFieldsValue(true)。不要加 clearOnDestroy，也不要改成 component={false}。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={locked}
          className={styles.form}
        >
          {showRefine ? (
            <>
              <Form.Item name="images" rules={[{ required: true, message: NO_IMAGE_WARNING }]}>
                <StudioImageUpload disabled={locked} required />
              </Form.Item>
              <Form.Item
                name="refineRequirement"
                label="精修要求"
                rules={[{ required: true, whitespace: true, message: REQUIREMENT_MISSING }]}
              >
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 9 }} />
              </Form.Item>
              <Form.Item name="refineSpec">
                <GenerateSpecForm />
              </Form.Item>
              {hasRefineResult ? (
                <Form.Item name="needsMultiview" label="产品多视角">
                  <Radio.Group
                    block
                    optionType="button"
                    buttonStyle="solid"
                    options={MULTIVIEW_NEED_OPTIONS}
                    disabled={locked}
                  />
                </Form.Item>
              ) : null}
            </>
          ) : (
            <>
              <SelectedStandards urls={selectedStandardUrls} />
              <Form.Item
                name="multiviewRequirement"
                label="多视角要求"
                rules={[{ required: true, whitespace: true, message: REQUIREMENT_MISSING }]}
              >
                <Input.TextArea autoSize={{ minRows: 6, maxRows: 10 }} />
              </Form.Item>
              <Form.Item name="multiviewSpec">
                <GenerateSpecForm />
              </Form.Item>
            </>
          )}
        </Form>
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.primary}
          type="primary"
          block
          size="large"
          loading={showRefine ? refining : multiviewGenerating}
          onClick={showRefine ? onRefine : onMultiview}
        >
          {showRefine ? REFINE_BUTTON : MULTIVIEW_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
