import { useEffect, useState } from 'react';
import { Form, Input, Modal } from 'antd';
import type {
  ProductRetouchTaskDetail,
  ProductRetouchTaskListItem,
} from '@/app/api/product-retouch/_shared/task-types';
import {
  CREATE_TITLE,
  EDIT_TITLE,
  NAME_LABEL,
  NAME_MAX_LENGTH,
  NAME_MAX_MESSAGE,
  NAME_PLACEHOLDER,
  NAME_REQUIRED,
} from './constants';
import { submitTaskForm, type TaskFormValues } from './utils';

type TaskFormModalProps = {
  open: boolean;
  task?: ProductRetouchTaskListItem;
  onOpenChange: (open: boolean) => void;
  onSuccess: (task: ProductRetouchTaskDetail) => void;
};

/** 新增任务，或编辑已有任务名称。 */
export default function TaskFormModal({ open, task, onOpenChange, onSuccess }: TaskFormModalProps) {
  const [form] = Form.useForm<TaskFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(task);

  // 每次打开按最新任务数据重设表单，避免复用上次残留的旧名称。
  useEffect(() => {
    if (open) {
      form.resetFields();
      if (task) form.setFieldsValue({ name: task.name });
    }
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
        let values: TaskFormValues;
        try {
          values = await form.validateFields();
        } catch {
          return;
        }
        setSubmitting(true);
        try {
          const result = await submitTaskForm(values, task);
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
      </Form>
    </Modal>
  );
}
