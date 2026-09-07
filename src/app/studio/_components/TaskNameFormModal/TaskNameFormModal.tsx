import { useEffect, useState, type ReactNode } from 'react';
import { Form, Input, Modal } from 'antd';
import {
  CREATE_TITLE,
  EDIT_TITLE,
  NAME_LABEL,
  NAME_MAX_LENGTH,
  NAME_MAX_MESSAGE,
  NAME_PLACEHOLDER,
  NAME_REQUIRED,
} from './constants';

export type TaskNameFormValues = {
  name: string;
};

type TaskNameFormModalProps<TValues extends TaskNameFormValues, TTask, TDetail> = {
  open: boolean;
  task?: TTask;
  onOpenChange: (open: boolean) => void;
  onSuccess: (task: TDetail) => void;
  submit: (values: TValues, task?: TTask) => Promise<TDetail>;
  extraFields?: ReactNode;
  initialValues?: Partial<TValues>;
};

/** 新增或编辑任务名称；电商等产品可用 extraFields 挂额外表单项。 */
export default function TaskNameFormModal<TValues extends TaskNameFormValues, TTask, TDetail>({
  open,
  task,
  onOpenChange,
  onSuccess,
  submit,
  extraFields,
  initialValues,
}: TaskNameFormModalProps<TValues, TTask, TDetail>) {
  const [form] = Form.useForm<TValues>();
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(task);

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValues) form.setFieldsValue(initialValues as TValues);
    }
    // 以 open/task 为触发点，避免调用方每次渲染新建 initialValues 对象导致表单被反复重置。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 见上
  }, [open, task, form]);

  return (
    <Modal
      title={editing ? EDIT_TITLE : CREATE_TITLE}
      open={open}
      destroyOnHidden
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      mask={{ closable: !submitting }}
      onCancel={() => onOpenChange(false)}
      onOk={async () => {
        let values: TValues;
        try {
          values = await form.validateFields();
        } catch {
          return;
        }
        setSubmitting(true);
        try {
          const result = await submit(values, task);
          onSuccess(result);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="name"
          label={NAME_LABEL}
          rules={[
            { required: true, message: NAME_REQUIRED },
            { max: NAME_MAX_LENGTH, message: NAME_MAX_MESSAGE },
          ]}
        >
          <Input placeholder={NAME_PLACEHOLDER} />
        </Form.Item>
        {extraFields}
      </Form>
    </Modal>
  );
}
