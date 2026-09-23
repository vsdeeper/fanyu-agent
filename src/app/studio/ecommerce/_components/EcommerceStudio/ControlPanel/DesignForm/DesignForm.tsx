import { Form } from 'antd';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import StudioImageUpload from '@/app/studio/_components/StudioImageUpload';
import { MAX_MODEL_IMAGES, MODEL_IMAGE_HINT, MODEL_IMAGE_SUBTITLE } from '../../constants';
import { isPosterTask } from '../../workflow';
import GenerateForm from '../GenerateForm';

type DesignFormProps = {
  taskType: EcommerceTaskType;
  disabled: boolean;
};

/**
 * 视觉设计 / 营销海报表单：海报步提供可选模特形象，其余就是出图规格。
 */
export default function DesignForm({ taskType, disabled }: DesignFormProps) {
  const poster = isPosterTask(taskType);

  return (
    <>
      {poster ? (
        <Form.Item name="modelImages">
          <StudioImageUpload
            max={MAX_MODEL_IMAGES}
            label="产品模特"
            subtitle={MODEL_IMAGE_SUBTITLE}
            hint={MODEL_IMAGE_HINT}
            ariaLabel="上传产品模特"
            disabled={disabled}
          />
        </Form.Item>
      ) : null}

      <Form.Item name="designSpec">
        <GenerateForm aspectRatioLabel={poster ? '比例' : '尺寸比例'} />
      </Form.Item>
    </>
  );
}
