import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Form, type TableProps } from 'antd';
import { useRouter } from 'next/navigation';
import type {
  ProductRetouchTaskDetail,
  ProductRetouchTaskListItem,
} from '@/app/api/product-retouch/_shared/task-types';
import { apiDelete } from '@/lib/shared/client/api-client';
import { createTaskColumns } from '../columns';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { getTaskEditorPath, normalizeSearchName, requestProductRetouchTasks } from '../utils';

type SearchFormValues = { name?: string };

type TaskListQuery = {
  current: number;
  pageSize: number;
  name?: string;
};

const INITIAL_QUERY: TaskListQuery = { current: 1, pageSize: DEFAULT_PAGE_SIZE };

/** 管理任务列表的查询、分页、刷新与新建/编辑弹窗状态。 */
export function useProductRetouchTaskList() {
  const { message } = App.useApp();
  const router = useRouter();
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductRetouchTaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProductRetouchTaskListItem>();
  const [query, setQuery] = useState<TaskListQuery>(INITIAL_QUERY);

  const fetchList = useCallback(async (next: TaskListQuery) => {
    setQuery(next);
    setLoading(true);
    try {
      const result = await requestProductRetouchTasks({
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    void requestProductRetouchTasks(INITIAL_QUERY)
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
  }, []);

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

  const onTableChange: TableProps<ProductRetouchTaskListItem>['onChange'] = (pagination) => {
    const nextPageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    void fetchList({
      current: nextPageSize !== query.pageSize ? 1 : (pagination.current ?? 1),
      pageSize: nextPageSize,
      name: query.name,
    });
  };

  const reload = () => fetchList(query);

  const handleCreateSuccess = (task: ProductRetouchTaskDetail) => {
    message.success('任务创建成功');
    setCreateOpen(false);
    router.push(getTaskEditorPath(task));
  };

  const handleEditSuccess = () => {
    message.success('任务名称已更新');
    setEditingTask(undefined);
    void fetchList(query);
  };

  const onDelete = useCallback(
    async (task: ProductRetouchTaskListItem) => {
      await apiDelete(`/api/product-retouch/tasks/${task.id}`);
      message.success('任务已删除');
      await fetchList(query);
    },
    [fetchList, message, query],
  );

  const columns = useMemo(
    () =>
      createTaskColumns({
        onEdit: setEditingTask,
        onMaterial: (task) => router.push(getTaskEditorPath(task)),
        onDelete,
      }),
    [onDelete, router],
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
