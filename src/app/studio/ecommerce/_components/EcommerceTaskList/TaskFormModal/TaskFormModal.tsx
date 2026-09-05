import { Form, Input, Modal, Select } from 'antd';
import type {
  EcommerceTaskDetail,
  EcommerceTaskListItem,
} from '@/app/api/ecommerce/_shared/task-types';
import { TASK_TYPE_OPTIONS } from '../constants';
import {
  CREATE_TITLE,
  EDIT_TITLE,
  NAME_LABEL,
  NAME_MAX_LENGTH,
  NAME_MAX_MESSAGE,
  NAME_PLACEHOLDER,
  NAME_REQUIRED,
  TYPE_LABEL,
  TYPE_PLACEHOLDER,
  TYPE_REQUIRED,
} from './constants';
import { submitTaskForm, type TaskFormValues } from './utils';

type TaskFormModalProps = {
  open: boolean;
  task?: EcommerceTaskListItem;
  onOpenChange: (open: boolean) => void;
  onSuccess: (task: EcommerceTaskDetail) => void;
};

/** 新增任务，或编辑已有任务名称；任务类型创建后只展示、不可改。 */
export default function TaskFormModal({ open, task, onOpenChange, onSuccess }: TaskFormModalProps) {
  const [form] = Form.useForm<TaskFormValues>();
  const editing = Boolean(task);

  return (
    <Modal
      title={editing ? EDIT_TITLE : CREATE_TITLE}
      open={open}
      destroyOnHidden
      onCancel={() => onOpenChange(false)}
      onOk={async () => {
        const values = await form.validateFields();
        const result = await submitTaskForm(values, task);
        onSuccess(result);
      }}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={task ? { name: task.name, taskType: task.taskType } : undefined}
      >
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
        <Form.Item
          name="taskType"
          label={TYPE_LABEL}
          rules={editing ? undefined : [{ required: true, message: TYPE_REQUIRED }]}
        >
          <Select placeholder={TYPE_PLACEHOLDER} options={TASK_TYPE_OPTIONS} disabled={editing} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
