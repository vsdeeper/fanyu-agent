import { Popconfirm, Space, Tag, Typography, type TableColumnsType } from 'antd';
import type { EcommerceTaskListItem } from '@/app/api/studio/ecommerce/_shared/task-types';
import {
  DELETE_CONFIRM_TITLE,
  DELETE_CONFIRM_DESCRIPTION,
  RUNNING_STEP_SUFFIX,
  stepLabelFor,
} from './constants';
import { formatTaskDateTime } from './utils';

/** 创建任务列表列定义，并将行操作回调注入操作列。 */
export function createTaskColumns({
  onDesign,
  onEdit,
  onDelete,
}: {
  onDesign: (task: EcommerceTaskListItem) => void;
  onEdit: (task: EcommerceTaskListItem) => void;
  onDelete: (task: EcommerceTaskListItem) => Promise<void>;
}): TableColumnsType<EcommerceTaskListItem> {
  return [
    {
      title: '任务名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      width: 110,
      render: (_, task) => <Tag>{task.taskType}</Tag>,
    },
    {
      title: '已产出步骤',
      dataIndex: 'completedStepKeys',
      render: (_, task) =>
        task.completedStepKeys.length === 0 && !task.runningStepKey ? (
          '未开始'
        ) : (
          <Space size={[4, 4]} wrap>
            {task.completedStepKeys.map((key) => (
              <Tag color="blue" key={key}>
                {stepLabelFor(task.taskType, key)}
              </Tag>
            ))}
            {task.runningStepKey ? (
              <Tag color="processing" key="running">
                {`${stepLabelFor(task.taskType, task.runningStepKey)}${RUNNING_STEP_SUFFIX}`}
              </Tag>
            ) : null}
          </Space>
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
          <Typography.Link onClick={() => onDesign(task)}>物料编辑</Typography.Link>
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
