import { HighlightOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { MODEL_REQUIREMENT_PLACEHOLDER } from '../../constants';
import type { ModelFormState, ProductImageItem, StudioSpecFields } from '../../types';
import GenerateForm from '../GenerateForm';
import ModelUpload from '../ModelUpload';
import { patchFormState } from '../utils';
import styles from './ModelForm.module.css';

type ModelFormProps = {
  portraits: ProductImageItem[];
  form: ModelFormState;
  disabled: boolean;
  helpWriteLoading: boolean;
  onPortraitsAppend: (files: File[]) => void;
  onPortraitRemove: (uid: string) => void;
  onFormChange: (next: ModelFormState) => void;
  onHelpWrite: () => void;
};

/**
 * 产品模特左栏：模特形象、模特要求、出图规格。
 */
export default function ModelForm({
  portraits,
  form,
  disabled,
  helpWriteLoading,
  onPortraitsAppend,
  onPortraitRemove,
  onFormChange,
  onHelpWrite,
}: ModelFormProps) {
  const handleSpecChange = (next: StudioSpecFields) => {
    onFormChange({ ...form, ...next });
  };

  return (
    <>
      <ModelUpload
        images={portraits}
        disabled={disabled}
        onAppend={onPortraitsAppend}
        onRemove={onPortraitRemove}
      />
      <label className={styles.field}>
        <span className={styles.label}>模特要求</span>
        <div className={styles.requirementWrap}>
          <Input.TextArea
            className={styles.requirement}
            value={form.modelRequirement}
            placeholder={MODEL_REQUIREMENT_PLACEHOLDER}
            autoSize={{ minRows: 3, maxRows: 10 }}
            disabled={disabled}
            onChange={(event) =>
              onFormChange(patchFormState(form, 'modelRequirement', event.target.value))
            }
          />
          <Button
            className={styles.helpWrite}
            size="small"
            icon={<HighlightOutlined />}
            loading={helpWriteLoading}
            disabled={disabled}
            onClick={onHelpWrite}
          >
            AI 帮写
          </Button>
        </div>
      </label>
      <GenerateForm form={form} disabled={disabled} onFormChange={handleSpecChange} />
    </>
  );
}
