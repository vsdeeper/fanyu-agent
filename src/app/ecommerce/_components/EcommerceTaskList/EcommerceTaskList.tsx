'use client';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Layout, Table, Typography } from 'antd';
import ModeSwitch from '@/components/ModeSwitch';
import {
  CREATE_TASK_BUTTON,
  QUERY_BUTTON,
  RESET_BUTTON,
  SEARCH_NAME_LABEL,
  SEARCH_NAME_PLACEHOLDER,
  TASK_LIST_TITLE,
} from './constants';
import TaskFormModal from './TaskFormModal';
import { useEcommerceTaskList } from './hooks/useEcommerceTaskList';
import styles from './EcommerceTaskList.module.css';

/** 电商设计任务列表：查询、新增、改名、删除和进入流程设计。 */
export default function EcommerceTaskList() {
  const {
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
  } = useEcommerceTaskList();

  return (
    <Layout className={styles.page}>
      <Layout.Header className={styles.header}>
        <Typography.Title level={5} className={styles.title}>
          {TASK_LIST_TITLE}
        </Typography.Title>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <Layout.Content className={styles.content}>
        <Card className={styles.searchCard}>
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
        <Card className={styles.tableCard}>
          <div className={styles.toolbar}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {CREATE_TASK_BUTTON}
            </Button>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              aria-label="刷新"
              onClick={() => void reload()}
            />
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
      </Layout.Content>
      <TaskFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />
      <TaskFormModal
        open={Boolean(editingTask)}
        task={editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(undefined);
        }}
        onSuccess={handleEditSuccess}
      />
    </Layout>
  );
}
