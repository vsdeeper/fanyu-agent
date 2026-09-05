import { Popconfirm, Space, Tag, Typography, type TableColumnsType } from 'antd';
import type { ProductRetouchTaskListItem } from '@/app/api/product-retouch/_shared/task-types';
import { DELETE_CONFIRM_DESCRIPTION, DELETE_CONFIRM_TITLE, STEP_LABELS } from './constants';
import { formatTaskDateTime } from './utils';

/** 创建任务列表列定义，并将行操作回调注入操作列。 */
export function createTaskColumns({
  onEdit,
  onMaterial,
  onDelete,
}: {
  onEdit: (task: ProductRetouchTaskListItem) => void;
  onMaterial: (task: ProductRetouchTaskListItem) => void;
  onDelete: (task: ProductRetouchTaskListItem) => Promise<void>;
}): TableColumnsType<ProductRetouchTaskListItem> {
  return [
    {
      title: '任务名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '已产出步骤',
      dataIndex: 'completedStepKeys',
      render: (_, task) =>
        task.completedStepKeys.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {task.completedStepKeys.map((key) => (
              <Tag color="blue" key={key}>
                {STEP_LABELS[key]}
              </Tag>
            ))}
          </Space>
        ) : (
          '未开始'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => formatTaskDateTime(value),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value: string) => formatTaskDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      render: (_, task) => (
        <Space size="middle">
          <Typography.Link onClick={() => onEdit(task)}>编辑</Typography.Link>
          <Typography.Link onClick={() => onMaterial(task)}>物料编辑</Typography.Link>
          <Popconfirm
            title={DELETE_CONFIRM_TITLE}
            description={DELETE_CONFIRM_DESCRIPTION}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(task)}
          >
            <Typography.Link type="danger">删除</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}
