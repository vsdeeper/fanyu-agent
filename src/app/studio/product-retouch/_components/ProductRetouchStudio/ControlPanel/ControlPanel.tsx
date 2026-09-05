import { HighlightOutlined } from '@ant-design/icons';
import { Button, Input, Radio } from 'antd';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import { MULTIVIEW_BUTTON, MULTIVIEW_NEED_OPTIONS, REFINE_BUTTON } from '../constants';
import type {
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchPhase,
  RefineFormState,
} from '../types';
import GenerateSpecForm from '../GenerateSpecForm';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  phase: ProductRetouchPhase;
  needsMultiview: boolean;
  hasRefineResult: boolean;
  images: ProductImageItem[];
  refineForm: RefineFormState;
  multiviewForm: MultiviewFormState;
  locked: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onNeedsMultiviewChange: (needed: boolean) => void;
  onRefineFormChange: (next: RefineFormState) => void;
  onMultiviewFormChange: (next: MultiviewFormState) => void;
  onRefine: () => void;
  onMultiview: () => void;
};

/** 产品精修工作台左栏：按当前步骤展示输入项与主操作。 */
export default function ControlPanel({
  phase,
  needsMultiview,
  hasRefineResult,
  images,
  refineForm,
  multiviewForm,
  locked,
  onImagesAppend,
  onImageRemove,
  onNeedsMultiviewChange,
  onRefineFormChange,
  onMultiviewFormChange,
  onRefine,
  onMultiview,
}: ControlPanelProps) {
  const refining = phase === 'refineGenerating';
  const multiviewGenerating = phase === 'multiviewGenerating';
  const showRefine = phase === 'refine' || refining;
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {showRefine ? (
          <>
            <StudioImageUpload
              images={images}
              disabled={locked}
              onAppend={onImagesAppend}
              onRemove={onImageRemove}
            />
            <label className={styles.field}>
              <span className={styles.label}>精修要求</span>
              <Input.TextArea
                value={refineForm.requirement}
                disabled={locked}
                autoSize={{ minRows: 5, maxRows: 9 }}
                onChange={(event) =>
                  onRefineFormChange({ ...refineForm, requirement: event.target.value })
                }
              />
            </label>
            <GenerateSpecForm
              form={refineForm}
              disabled={locked}
              onChange={(next) => onRefineFormChange({ ...refineForm, ...next })}
            />
            {hasRefineResult ? (
              <label className={styles.field}>
                <span className={styles.label}>产品多视角</span>
                <Radio.Group
                  block
                  optionType="button"
                  buttonStyle="solid"
                  value={needsMultiview}
                  options={MULTIVIEW_NEED_OPTIONS}
                  disabled={locked}
                  onChange={(event) => onNeedsMultiviewChange(event.target.value as boolean)}
                />
              </label>
            ) : null}
          </>
        ) : (
          <>
            <label className={styles.field}>
              <span className={styles.label}>多视角要求</span>
              <Input.TextArea
                value={multiviewForm.requirement}
                disabled={locked}
                autoSize={{ minRows: 6, maxRows: 10 }}
                onChange={(event) =>
                  onMultiviewFormChange({
                    ...multiviewForm,
                    requirement: event.target.value,
                  })
                }
              />
            </label>
            <GenerateSpecForm
              form={multiviewForm}
              disabled={locked}
              onChange={(next) => onMultiviewFormChange({ ...multiviewForm, ...next })}
            />
          </>
        )}
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.primary}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={showRefine ? refining : multiviewGenerating}
          disabled={showRefine && images.length === 0}
          onClick={showRefine ? onRefine : onMultiview}
        >
          {showRefine ? REFINE_BUTTON : MULTIVIEW_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
