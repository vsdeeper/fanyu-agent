import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Form, type TableColumnsType, type TableProps } from 'antd';
import { useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/shared/client/api-client';
import { requestStudioTasks, normalizeSearchName } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from '@/app/studio/_components/StudioTaskList/constants';

type SearchFormValues = { name?: string };

type TaskListQuery = {
  current: number;
  pageSize: number;
  name?: string;
};

type StudioTaskListItemBase = { id: string };

type UseStudioTaskListOptions<TItem extends StudioTaskListItemBase> = {
  apiBase: string;
  getEditorPath: (task: { id: string }) => string;
  createColumns: (handlers: {
    onEdit: (task: TItem) => void;
    onOpenEditor: (task: TItem) => void;
    onDelete: (task: TItem) => Promise<void>;
  }) => TableColumnsType<TItem>;
  pageSize?: number;
};

/** 管理工作室任务列表的查询、分页、刷新与新建/编辑弹窗状态。 */
export function useStudioTaskList<
  TItem extends StudioTaskListItemBase,
  TDetail extends { id: string },
>({
  apiBase,
  getEditorPath,
  createColumns,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseStudioTaskListOptions<TItem>) {
  const { message } = App.useApp();
  const router = useRouter();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TItem>();
  const [query, setQuery] = useState<TaskListQuery>({ current: 1, pageSize });

  const fetchList = useCallback(
    async (next: TaskListQuery) => {
      setQuery(next);
      setLoading(true);
      try {
        const result = await requestStudioTasks<TItem>(apiBase, {
          current: next.current,
          pageSize: next.pageSize,
          name: next.name,
        });
        setItems(result.items);
        setTotal(result.total);
      } catch {
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    let cancelled = false;
    void requestStudioTasks<TItem>(apiBase, { current: 1, pageSize })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, pageSize]);

  const onSearch = (values: SearchFormValues) => {
    void fetchList({
      current: 1,
      pageSize: query.pageSize,
      name: normalizeSearchName(values.name),
    });
  };

  const onReset = () => {
    searchForm.resetFields();
    void fetchList({ current: 1, pageSize: query.pageSize, name: undefined });
  };

  const onTableChange: TableProps<TItem>['onChange'] = (pagination) => {
    const nextPageSize = pagination.pageSize ?? pageSize;
    void fetchList({
      current: nextPageSize !== query.pageSize ? 1 : (pagination.current ?? 1),
      pageSize: nextPageSize,
      name: query.name,
    });
  };

  const reload = () => fetchList(query);

  const handleCreateSuccess = (task: TDetail) => {
    message.success('任务创建成功');
    setCreateOpen(false);
    router.push(getEditorPath(task));
  };

  const handleEditSuccess = () => {
    message.success('任务名称已更新');
    setEditingTask(undefined);
    void fetchList(query);
  };

  const onDelete = useCallback(
    async (task: TItem) => {
      await apiDelete(`${apiBase}/tasks/${task.id}`);
      message.success('任务已删除');
      await fetchList(query);
    },
    [apiBase, fetchList, message, query],
  );

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: setEditingTask,
        onOpenEditor: (task) => {
          router.push(getEditorPath(task));
        },
        onDelete,
      }),
    [createColumns, getEditorPath, onDelete, router],
  );

  return {
    searchForm,
    loading,
    items,
    total,
    query,
    columns,
    createOpen,
    setCreateOpen,
    editingTask,
    setEditingTask,
    onSearch,
    onReset,
    onTableChange,
    reload,
    handleCreateSuccess,
    handleEditSuccess,
  };
}
