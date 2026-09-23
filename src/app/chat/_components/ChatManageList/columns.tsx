import { Popconfirm, Space, Typography, type TableColumnsType } from 'antd';
import type { ChatListItem } from '@/app/api/chats/_shared/types';
import { DELETE_CONFIRM_DESCRIPTION, DELETE_CONFIRM_TITLE } from './constants';
import { formatChatDateTime } from './utils';

/** 创建对话管理列表列定义。 */
export function createChatColumns({
  onOpen,
  onDelete,
}: {
  onOpen: (chat: ChatListItem) => void;
  onDelete: (chat: ChatListItem) => Promise<void>;
}): TableColumnsType<ChatListItem> {
  return [
    {
      title: '对话名称',
      dataIndex: 'title',
      ellipsis: true,
      render: (value: string, chat) => (
        <Typography.Link onClick={() => onOpen(chat)}>{value}</Typography.Link>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => formatChatDateTime(value),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value: string) => formatChatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, chat) => (
        <Space size="middle">
          <Popconfirm
            title={DELETE_CONFIRM_TITLE}
            description={DELETE_CONFIRM_DESCRIPTION}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(chat)}
          >
            <Typography.Link type="danger">删除</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}
