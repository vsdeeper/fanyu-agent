'use client';

import { useCallback } from 'react';
import type {
  BusinessAnalysisTaskDetail,
  BusinessAnalysisTaskListItem,
} from '@/app/api/studio/business-analysis/_shared/task-types';
import StudioPageShell from '@/app/studio/_components/StudioPageShell';
import StudioTaskList from '@/app/studio/_components/StudioTaskList';
import TaskNameFormModal from '@/app/studio/_components/TaskNameFormModal';
import { useStudioTaskList } from '@/app/studio/_hooks/useStudioTaskList';
import { TASK_LIST_TITLE } from './constants';
import { createTaskColumns } from './columns';
import { getTaskEditorPath } from './utils';
import { submitTaskForm, type TaskFormValues } from './TaskFormModal/utils';

/** 商业分析任务列表：查询、新增、改名、删除和进入物料编辑。 */
export default function BusinessAnalysisTaskList() {
  const createColumns = useCallback(
    ({
      onEdit,
      onOpenEditor,
      onDelete,
    }: {
      onEdit: (task: BusinessAnalysisTaskListItem) => void;
      onOpenEditor: (task: BusinessAnalysisTaskListItem) => void;
      onDelete: (task: BusinessAnalysisTaskListItem) => Promise<void>;
    }) => createTaskColumns({ onEdit, onMaterial: onOpenEditor, onDelete }),
    [],
  );
  const list = useStudioTaskList<BusinessAnalysisTaskListItem, BusinessAnalysisTaskDetail>({
    apiBase: '/api/studio/business-analysis',
    getEditorPath: getTaskEditorPath,
    createColumns,
  });

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
        <TaskNameFormModal<TaskFormValues, BusinessAnalysisTaskListItem, BusinessAnalysisTaskDetail>
          open={list.createOpen}
          onOpenChange={list.setCreateOpen}
          onSuccess={list.handleCreateSuccess}
          submit={submitTaskForm}
        />
        <TaskNameFormModal<TaskFormValues, BusinessAnalysisTaskListItem, BusinessAnalysisTaskDetail>
          open={Boolean(list.editingTask)}
          task={list.editingTask}
          onOpenChange={(open) => {
            if (!open) list.setEditingTask(undefined);
          }}
          onSuccess={list.handleEditSuccess}
          submit={submitTaskForm}
          initialValues={list.editingTask ? { name: list.editingTask.name } : undefined}
        />
      </StudioTaskList>
    </StudioPageShell>
  );
}
