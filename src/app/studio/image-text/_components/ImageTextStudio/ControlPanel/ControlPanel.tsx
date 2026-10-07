import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, Switch, Tooltip } from 'antd';
import type { FormInstance } from 'antd';
import {
  IMAGE_TEXT_MAX_CONTENT_LENGTH,
  IMAGE_TEXT_MAX_DOCUMENTS,
  IMAGE_TEXT_MAX_MATERIALS,
} from '@/app/api/studio/image-text/_shared/constants';
import GenerateSpecFields from '@/app/studio/_components/GenerateSpecFields';
import ProductDocsUpload from '@/app/studio/_components/ProductDocsUpload';
import StudioImageUpload from '@/app/studio/_components/StudioImageUpload';
import {
  CHARACTER_REQUIREMENT_HINT,
  CHARACTER_REQUIREMENT_LABEL,
  CHARACTER_REQUIREMENT_MAX_LENGTH,
  CHARACTER_REQUIREMENT_PLACEHOLDER,
  DISCLAIMER_HINT,
  DISCLAIMER_LABEL,
  CONTENT_LABEL,
  CONTENT_PLACEHOLDER,
  DOCUMENTS_HINT,
  DOCUMENTS_LABEL,
  DOCUMENTS_SUBTITLE,
  DOCUMENTS_ACCEPT,
  DOCUMENTS_TYPE_WARNING,
  GENERATE_BUTTON,
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
  generating: boolean;
  onPlan: () => void;
  onGenerate: () => void;
};

/** 校验素材图、素材文件与内容至少其一。 */
async function requireMaterialsOrContent(
  materials: ImageTextPanelValues['materials'] | undefined,
  documents: ImageTextPanelValues['documents'] | undefined,
  content: string | undefined,
) {
  const hasMaterials = Boolean(materials?.length);
  const hasDocuments = Boolean(documents?.length);
  const hasContent = Boolean(String(content ?? '').trim());
  if (!hasMaterials && !hasDocuments && !hasContent) throw new Error(MISSING_INPUT_WARNING);
}

/** 图文素材文件允许 TXT / MD / PDF。 */
function isAllowedImageTextDocFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.pdf')) return true;
  return (
    file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'application/pdf'
  );
}

/** 图文左栏：内容步收集素材与内容；生成步收集参考图与出图规格。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  canGenerate,
  generating,
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
              <Form.Item
                name="characterRequirement"
                label={
                  <span className={styles.labelWithTip}>
                    {CHARACTER_REQUIREMENT_LABEL}
                    <Tooltip title={CHARACTER_REQUIREMENT_HINT}>
                      <span
                        className={styles.labelTipIcon}
                        role="img"
                        aria-label={CHARACTER_REQUIREMENT_HINT}
                      >
                        <QuestionCircleOutlined />
                      </span>
                    </Tooltip>
                  </span>
                }
                preserve
              >
                <Input.TextArea
                  rows={3}
                  maxLength={CHARACTER_REQUIREMENT_MAX_LENGTH}
                  showCount
                  placeholder={CHARACTER_REQUIREMENT_PLACEHOLDER}
                  disabled={generating}
                />
              </Form.Item>
              <div className={styles.switchBlock}>
                <div className={styles.switchRow}>
                  <span className={styles.blockLabel}>{DISCLAIMER_LABEL}</span>
                  <Form.Item name="includeDisclaimer" valuePropName="checked" preserve noStyle>
                    <Switch disabled={generating} aria-label={DISCLAIMER_LABEL} />
                  </Form.Item>
                </div>
                <p className={styles.switchHint}>{DISCLAIMER_HINT}</p>
              </div>
              <GenerateSpecFields namePrefix={['spec']} showCount={false} />
            </>
          ) : (
            <>
              <Form.Item
                name="materials"
                preserve
                dependencies={['content', 'documents']}
                rules={[
                  {
                    validator: async (_, value: ImageTextPanelValues['materials'] | undefined) => {
                      await requireMaterialsOrContent(
                        value,
                        form.getFieldValue('documents'),
                        form.getFieldValue('content'),
                      );
                    },
                  },
                ]}
              >
                <StudioImageUpload
                  max={IMAGE_TEXT_MAX_MATERIALS}
                  label={MATERIALS_LABEL}
                  subtitle=""
                  hint={MATERIALS_HINT}
                  ariaLabel="上传素材图"
                  disabled={planning}
                />
              </Form.Item>
              <Form.Item
                name="documents"
                preserve
                dependencies={['materials', 'content']}
                rules={[
                  {
                    validator: async (_, value: ImageTextPanelValues['documents'] | undefined) => {
                      await requireMaterialsOrContent(
                        form.getFieldValue('materials'),
                        value,
                        form.getFieldValue('content'),
                      );
                    },
                  },
                ]}
              >
                <ProductDocsUpload
                  max={IMAGE_TEXT_MAX_DOCUMENTS}
                  label={DOCUMENTS_LABEL}
                  subtitle={DOCUMENTS_SUBTITLE}
                  hint={DOCUMENTS_HINT}
                  accept={DOCUMENTS_ACCEPT}
                  typeWarning={DOCUMENTS_TYPE_WARNING}
                  isAllowedFile={isAllowedImageTextDocFile}
                  ariaLabel="上传素材文件"
                  disabled={planning}
                />
              </Form.Item>
              <Form.Item
                name="content"
                label={CONTENT_LABEL}
                preserve
                dependencies={['materials', 'documents']}
                rules={[
                  {
                    validator: async (_, value: string | undefined) => {
                      await requireMaterialsOrContent(
                        form.getFieldValue('materials'),
                        form.getFieldValue('documents'),
                        value,
                      );
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
