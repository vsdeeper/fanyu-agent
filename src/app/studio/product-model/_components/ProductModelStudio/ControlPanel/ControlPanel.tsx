import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, type FormInstance } from 'antd';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  GENERATE_BUTTON,
  MAX_MODEL_IMAGES,
  MODEL_IMAGE_SUBTITLE,
  NO_IMAGE_WARNING,
  PRODUCT_IMAGE_SUBTITLE,
  REQUIREMENT_MISSING,
} from '../constants';
import type { ProductModelPanelValues } from '../types';
import GenerateSpecForm from '../GenerateSpecForm';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<ProductModelPanelValues>;
  initialValues: ProductModelPanelValues;
  generating: boolean;
  onGenerate: () => void;
};

/** 产品模特工作台左栏：产品与模特参考图、视角要求和出图规格。 */
export default function ControlPanel({
  form,
  initialValues,
  generating,
  onGenerate,
}: ControlPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {/*
          左栏值的唯一真相是这份 Form store。面板卸载后 store 仍在，故 hook 里读值必须用
          getFieldsValue(true)；因此不要给这个 Form 加 clearOnDestroy，否则完成步返回时表单会空。
          component={false} 同样不可用：本项目 cssVar.prefix='one'，antd 组件必须渲染真实节点。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={generating}
          className={styles.form}
        >
          <Form.Item name="productImages" rules={[{ required: true, message: NO_IMAGE_WARNING }]}>
            <StudioImageUpload
              label="产品精修图"
              subtitle={PRODUCT_IMAGE_SUBTITLE}
              disabled={generating}
              required
            />
          </Form.Item>
          <Form.Item name="modelImages">
            <StudioImageUpload
              max={MAX_MODEL_IMAGES}
              label="模特形象"
              subtitle={MODEL_IMAGE_SUBTITLE}
              hint="上传模特身份参考图（可选）"
              ariaLabel="上传模特形象"
              disabled={generating}
            />
          </Form.Item>
          <Form.Item
            name="viewRequirement"
            label="生成要求"
            rules={[{ required: true, whitespace: true, message: REQUIREMENT_MISSING }]}
          >
            <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} />
          </Form.Item>
          <Form.Item name="spec">
            <GenerateSpecForm />
          </Form.Item>
        </Form>
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.primary}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={generating}
          onClick={onGenerate}
        >
          {GENERATE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
