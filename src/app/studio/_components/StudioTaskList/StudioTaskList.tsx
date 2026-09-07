import type { ReactNode } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Table, type FormInstance, type TableProps } from 'antd';
import {
  CREATE_TASK_BUTTON,
  QUERY_BUTTON,
  RESET_BUTTON,
  SEARCH_NAME_LABEL,
  SEARCH_NAME_PLACEHOLDER,
} from './constants';
import styles from './StudioTaskList.module.css';

type StudioTaskListProps<TItem extends { id: string }> = {
  searchForm: FormInstance<{ name?: string }>;
  loading: boolean;
  items: TItem[];
  total: number;
  query: { current: number; pageSize: number };
  columns: TableProps<TItem>['columns'];
  onSearch: (values: { name?: string }) => void;
  onReset: () => void;
  onTableChange: TableProps<TItem>['onChange'];
  onCreate: () => void;
  onReload: () => void;
  children?: ReactNode;
};

/** 工作室任务列表：搜索、表格与弹窗插槽。 */
export default function StudioTaskList<TItem extends { id: string }>({
  searchForm,
  loading,
  items,
  total,
  query,
  columns,
  onSearch,
  onReset,
  onTableChange,
  onCreate,
  onReload,
  children,
}: StudioTaskListProps<TItem>) {
  return (
    <>
      <Card className={styles.searchCard} variant="borderless">
        <Form form={searchForm} layout="inline" className={styles.searchForm} onFinish={onSearch}>
          <Form.Item name="name" label={SEARCH_NAME_LABEL}>
            <Input
              allowClear
              placeholder={SEARCH_NAME_PLACEHOLDER}
              className={styles.searchInput}
            />
          </Form.Item>
          <div className={styles.searchActions}>
            <Button onClick={onReset}>{RESET_BUTTON}</Button>
            <Button type="primary" htmlType="submit">
              {QUERY_BUTTON}
            </Button>
          </div>
        </Form>
      </Card>
      <Card className={styles.tableCard} variant="borderless">
        <div className={styles.toolbar}>
          <Button type="primary" onClick={onCreate}>
            {CREATE_TASK_BUTTON}
          </Button>
          <Button type="text" icon={<ReloadOutlined />} aria-label="刷新" onClick={onReload} />
        </div>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={items}
          onChange={onTableChange}
          pagination={{
            current: query.current,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
          }}
        />
      </Card>
      {children}
    </>
  );
}
