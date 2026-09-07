'use client';

import { useCallback } from 'react';
import { Form, Select } from 'antd';
import type {
  EcommerceTaskDetail,
  EcommerceTaskListItem,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import StudioPageShell from '@/app/studio/_components/StudioPageShell';
import StudioTaskList from '@/app/studio/_components/StudioTaskList';
import TaskNameFormModal from '@/app/studio/_components/TaskNameFormModal';
import { useStudioTaskList } from '@/app/studio/_hooks/useStudioTaskList';
import { TASK_LIST_TITLE, TASK_TYPE_OPTIONS } from './constants';
import { createTaskColumns } from './columns';
import { getTaskEditorPath } from './utils';
import { submitTaskForm, type TaskFormValues } from './TaskFormModal/utils';
import { TYPE_LABEL, TYPE_PLACEHOLDER, TYPE_REQUIRED } from './TaskFormModal/constants';

/** 电商设计任务列表：查询、新增、改名、删除和进入流程设计。 */
export default function EcommerceTaskList() {
  const createColumns = useCallback(
    ({
      onEdit,
      onOpenEditor,
      onDelete,
    }: {
      onEdit: (task: EcommerceTaskListItem) => void;
      onOpenEditor: (task: EcommerceTaskListItem) => void;
      onDelete: (task: EcommerceTaskListItem) => Promise<void>;
    }) => createTaskColumns({ onEdit, onDesign: onOpenEditor, onDelete }),
    [],
  );
  const list = useStudioTaskList<EcommerceTaskListItem, EcommerceTaskDetail>({
    apiBase: '/api/studio/ecommerce',
    getEditorPath: getTaskEditorPath,
    createColumns,
  });

  const extraFields = (editing: boolean) => (
    <Form.Item
      name="taskType"
      label={TYPE_LABEL}
      rules={editing ? undefined : [{ required: true, message: TYPE_REQUIRED }]}
    >
      <Select placeholder={TYPE_PLACEHOLDER} options={TASK_TYPE_OPTIONS} disabled={editing} />
    </Form.Item>
  );

  return (
    <StudioPageShell title={TASK_LIST_TITLE}>
      <StudioTaskList
        searchForm={list.searchForm}
        loading={list.loading}
        items={list.items}
        total={list.total}
        query={list.query}
        columns={list.columns}
        onSearch={list.onSearch}
        onReset={list.onReset}
        onTableChange={list.onTableChange}
        onCreate={() => list.setCreateOpen(true)}
        onReload={() => void list.reload()}
      >
        <TaskNameFormModal<TaskFormValues, EcommerceTaskListItem, EcommerceTaskDetail>
          open={list.createOpen}
          onOpenChange={list.setCreateOpen}
          onSuccess={list.handleCreateSuccess}
          submit={submitTaskForm}
          extraFields={extraFields(false)}
        />
        <TaskNameFormModal<TaskFormValues, EcommerceTaskListItem, EcommerceTaskDetail>
          open={Boolean(list.editingTask)}
          task={list.editingTask}
          onOpenChange={(open) => {
            if (!open) list.setEditingTask(undefined);
          }}
          onSuccess={list.handleEditSuccess}
          submit={submitTaskForm}
          extraFields={extraFields(true)}
          initialValues={
            list.editingTask
              ? { name: list.editingTask.name, taskType: list.editingTask.taskType }
              : undefined
          }
        />
      </StudioTaskList>
    </StudioPageShell>
  );
}
