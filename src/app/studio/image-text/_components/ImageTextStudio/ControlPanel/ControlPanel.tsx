import { PictureOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import type { FormInstance } from 'antd';
import {
  IMAGE_TEXT_MAX_CONTENT_LENGTH,
  IMAGE_TEXT_MAX_MATERIALS,
} from '@/app/api/studio/image-text/_shared/constants';
import GenerateSpecForm, {
  type GenerateSpecFormFields,
} from '@/app/studio/_components/GenerateSpecForm';
import { toModelOptions } from '@/app/studio/_utils/model-options';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  CHARACTER_MODEL_HINT,
  CHARACTER_MODEL_LABEL,
  CHARACTER_REQUIREMENT_LABEL,
  CHARACTER_REQUIREMENT_MAX_LENGTH,
  CHARACTER_REQUIREMENT_PLACEHOLDER,
  CONTENT_LABEL,
  CONTENT_PLACEHOLDER,
  GENERATE_BUTTON,
  IMAGE_ASPECT_RATIO_OPTIONS,
  MATERIALS_HINT,
  MATERIALS_LABEL,
  MISSING_INPUT_WARNING,
  PLAN_BUTTON,
  VISUAL_REFERENCE_HINT,
  VISUAL_REFERENCE_LABEL,
} from '../constants';
import type { ImageTextPanelValues, ImageTextPhase } from '../types';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<ImageTextPanelValues>;
  initialValues: ImageTextPanelValues;
  phase: ImageTextPhase;
  canGenerate: boolean;
  spec: GenerateSpecFormFields;
  generating: boolean;
  onSpecChange: (next: GenerateSpecFormFields) => void;
  onPlan: () => void;
  onGenerate: () => void;
};

/** 校验素材与内容至少其一。 */
async function requireMaterialsOrContent(
  materials: ImageTextPanelValues['materials'] | undefined,
  content: string | undefined,
) {
  const hasMaterials = Boolean(materials?.length);
  const hasContent = Boolean(String(content ?? '').trim());
  if (!hasMaterials && !hasContent) throw new Error(MISSING_INPUT_WARNING);
}

/** 图文左栏：内容步收集素材与内容；生成步收集参考图与出图规格。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  canGenerate,
  spec,
  generating,
  onSpecChange,
  onPlan,
  onGenerate,
}: ControlPanelProps) {
  const planning = phase === 'planning';
  const generatingStep = phase === 'generate';

  return (
    <aside className={styles.panel}>
      <Form
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={initialValues}
        requiredMark={false}
      >
        <div className={styles.scroll}>
          {generatingStep ? (
            <>
              <Form.Item name="styleReferenceImages" preserve>
                <StudioImageUpload
                  max={1}
                  label={VISUAL_REFERENCE_LABEL}
                  subtitle=""
                  hint={VISUAL_REFERENCE_HINT}
                  ariaLabel="上传视觉参考"
                  disabled={generating}
                />
              </Form.Item>
              <Form.Item name="characterModelImages" preserve>
                <StudioImageUpload
                  max={1}
                  label={CHARACTER_MODEL_LABEL}
                  subtitle=""
                  hint={CHARACTER_MODEL_HINT}
                  ariaLabel="上传人物模特"
                  disabled={generating}
                />
              </Form.Item>
              <Form.Item name="characterRequirement" label={CHARACTER_REQUIREMENT_LABEL} preserve>
                <Input.TextArea
                  rows={3}
                  maxLength={CHARACTER_REQUIREMENT_MAX_LENGTH}
                  showCount
                  placeholder={CHARACTER_REQUIREMENT_PLACEHOLDER}
                  disabled={generating}
                />
              </Form.Item>
              <GenerateSpecForm
                value={spec}
                onChange={onSpecChange}
                modelOptions={toModelOptions()}
                aspectRatioOptions={IMAGE_ASPECT_RATIO_OPTIONS}
                showCount={false}
              />
            </>
          ) : (
            <>
              <Form.Item
                name="materials"
                preserve
                dependencies={['content']}
                rules={[
                  {
                    validator: async (_, value: ImageTextPanelValues['materials'] | undefined) => {
                      await requireMaterialsOrContent(value, form.getFieldValue('content'));
                    },
                  },
                ]}
              >
                <StudioImageUpload
                  max={IMAGE_TEXT_MAX_MATERIALS}
                  label={MATERIALS_LABEL}
                  subtitle=""
                  hint={MATERIALS_HINT}
                  ariaLabel="上传素材"
                  disabled={planning}
                />
              </Form.Item>
              <Form.Item
                name="content"
                label={CONTENT_LABEL}
                preserve
                dependencies={['materials']}
                rules={[
                  {
                    validator: async (_, value: string | undefined) => {
                      await requireMaterialsOrContent(form.getFieldValue('materials'), value);
                    },
                  },
                ]}
              >
                <Input.TextArea
                  rows={8}
                  maxLength={IMAGE_TEXT_MAX_CONTENT_LENGTH}
                  showCount
                  placeholder={CONTENT_PLACEHOLDER}
                  disabled={planning}
                />
              </Form.Item>
            </>
          )}
        </div>
      </Form>
      <div className={styles.footer}>
        {generatingStep ? (
          <Button
            type="primary"
            block
            className={styles.actionBtn}
            icon={<PictureOutlined />}
            loading={generating}
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {GENERATE_BUTTON}
          </Button>
        ) : (
          <Button
            type="primary"
            block
            className={styles.actionBtn}
            loading={planning}
            onClick={onPlan}
          >
            {PLAN_BUTTON}
          </Button>
        )}
      </div>
    </aside>
  );
}
