import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { App, Form } from 'antd';
import { useRouter } from 'next/navigation';
import type { ChatListItem } from '@/app/api/chats/_shared/types';
import { CHAT_DRAFT_PATH } from '@/components/AppLayout/constants';
import { apiDelete, apiPost } from '@/lib/shared/client/api-client';
import { createChatColumns } from '../columns';
import { BATCH_DELETE_CONFIRM_TITLE, DELETE_CONFIRM_DESCRIPTION } from '../constants';
import { normalizeSearchTitle, requestManagedChats, toCreatedRangeIso } from '../utils';

type RangeValue = { toDate: () => Date };

export type ChatManageSearchValues = {
  title?: string;
  createdRange?: [RangeValue, RangeValue] | null;
};

type ChatListQuery = {
  title?: string;
  createdFrom?: string;
  createdTo?: string;
};

/** 管理对话列表的查询、选中、单删与批删。 */
export function useChatManageList() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [searchForm] = Form.useForm<ChatManageSearchValues>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [query, setQuery] = useState<ChatListQuery>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async (next: ChatListQuery) => {
    setQuery(next);
    setLoading(true);
    try {
      const nextItems = await requestManagedChats(next);
      setItems(nextItems);
      setSelectedRowKeys([]);
    } catch {
      setItems([]);
      setSelectedRowKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void requestManagedChats({})
      .then((nextItems) => {
        if (cancelled) return;
        setItems(nextItems);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSearch = (values: ChatManageSearchValues) => {
    const range = values.createdRange;
    const { createdFrom, createdTo } = toCreatedRangeIso(
      range?.[0]?.toDate() ?? null,
      range?.[1]?.toDate() ?? null,
    );
    void fetchList({
      title: normalizeSearchTitle(values.title),
      createdFrom,
      createdTo,
    });
  };

  const onReset = () => {
    searchForm.resetFields();
    void fetchList({});
  };

  const reload = () => fetchList(query);

  const refreshAfterDelete = useCallback(() => {
    router.refresh();
  }, [router]);

  const onDelete = useCallback(
    async (chat: ChatListItem) => {
      await apiDelete<null>(`/api/chats/${chat.id}`);
      message.success('对话已删除');
      refreshAfterDelete();
      await fetchList(query);
    },
    [fetchList, message, query, refreshAfterDelete],
  );

  const onBatchDelete = useCallback(() => {
    const ids = selectedRowKeys.map(String);
    if (ids.length === 0) return;

    modal.confirm({
      title: `${BATCH_DELETE_CONFIRM_TITLE}（${ids.length} 条）`,
      content: DELETE_CONFIRM_DESCRIPTION,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          await apiPost<{ deleted: number }>('/api/chats/batch-delete', { ids });
          message.success(`已删除 ${ids.length} 条对话`);
          refreshAfterDelete();
          await fetchList(query);
        } finally {
          setDeleting(false);
        }
      },
    });
  }, [fetchList, message, modal, query, refreshAfterDelete, selectedRowKeys]);

  const onOpen = useCallback(
    (chat: ChatListItem) => {
      router.push(`${CHAT_DRAFT_PATH}/${chat.id}`);
    },
    [router],
  );

  const columns = useMemo(
    () =>
      createChatColumns({
        onOpen,
        onDelete,
      }),
    [onDelete, onOpen],
  );

  return {
    searchForm,
    loading,
    deleting,
    items,
    columns,
    selectedRowKeys,
    setSelectedRowKeys,
    onSearch,
    onReset,
    onBatchDelete,
    reload,
  };
}
