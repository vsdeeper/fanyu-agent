'use client';

import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, Layout, Table, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { CHAT_DRAFT_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import {
  BATCH_DELETE_BUTTON,
  PAGE_TITLE,
  QUERY_BUTTON,
  RELOAD_ARIA_LABEL,
  RESET_BUTTON,
  SEARCH_CREATED_LABEL,
  SEARCH_TITLE_LABEL,
  SEARCH_TITLE_PLACEHOLDER,
  TABLE_SCROLL_Y,
} from './constants';
import { useChatManageList } from './hooks/useChatManageList';
import { formatTotalCount } from './utils';
import styles from './ChatManageList.module.css';

/** 对话管理列表：名称/创建日期筛选、虚拟滚动、单删与批删。 */
export default function ChatManageList() {
  const router = useRouter();
  const list = useChatManageList();

  return (
    <Layout className={styles.page}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回对话"
          onClick={() => router.push(CHAT_DRAFT_PATH)}
        />
        <Typography.Title level={5} className={styles.title}>
          {PAGE_TITLE}
        </Typography.Title>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <Layout.Content className={styles.content}>
        <Card className={styles.searchCard} variant="borderless">
          <Form
            form={list.searchForm}
            layout="inline"
            className={styles.searchForm}
            onFinish={list.onSearch}
          >
            <Form.Item name="title" label={SEARCH_TITLE_LABEL}>
              <Input
                allowClear
                placeholder={SEARCH_TITLE_PLACEHOLDER}
                className={styles.searchInput}
              />
            </Form.Item>
            <Form.Item name="createdRange" label={SEARCH_CREATED_LABEL}>
              <DatePicker.RangePicker className={styles.searchRange} allowClear />
            </Form.Item>
            <div className={styles.searchActions}>
              <Button onClick={list.onReset}>{RESET_BUTTON}</Button>
              <Button type="primary" htmlType="submit">
                {QUERY_BUTTON}
              </Button>
            </div>
          </Form>
        </Card>
        <Card className={styles.tableCard} variant="borderless">
          <div className={styles.toolbar}>
            <div className={styles.toolbarActions}>
              <Button
                danger
                disabled={list.selectedRowKeys.length === 0 || list.deleting}
                loading={list.deleting}
                onClick={list.onBatchDelete}
              >
                {BATCH_DELETE_BUTTON}
              </Button>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              aria-label={RELOAD_ARIA_LABEL}
              onClick={() => void list.reload()}
            />
          </div>
          <Table
            rowKey="id"
            size="middle"
            loading={list.loading}
            columns={list.columns}
            dataSource={list.items}
            pagination={false}
            virtual
            scroll={{ y: TABLE_SCROLL_Y }}
            rowSelection={{
              columnWidth: 50,
              selectedRowKeys: list.selectedRowKeys,
              onChange: list.setSelectedRowKeys,
            }}
          />
          <div className={styles.tableFooter}>
            <Typography.Text className={styles.totalCount}>
              {formatTotalCount(list.items.length)}
            </Typography.Text>
          </div>
        </Card>
      </Layout.Content>
    </Layout>
  );
}
