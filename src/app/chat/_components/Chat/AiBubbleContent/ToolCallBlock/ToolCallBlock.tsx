import { useState } from 'react';
import { Think } from '@ant-design/x';
import { Typography } from 'antd';
import styles from './ToolCallBlock.module.css';
import { FAILED_ICON, FAILED_LABEL, FALLBACK_TOOL_ICON, TOOL_ICONS } from './constants';
import {
  getPendingTitle,
  getToolError,
  getToolInputRows,
  getToolName,
  getToolStatus,
  getToolTitle,
} from './utils';

export type ToolCallBlockProps = {
  part: { type: string; [key: string]: unknown };
};

/**
 * 工具调用块：折叠时一行工具名，点开看全量入参（如生图 prompt 全文）。
 * 调用中转圈并自动展开；完成后收起；失败时展开以便查看原因（与思考块同模式）。
 */
export default function ToolCallBlock({ part }: ToolCallBlockProps) {
  const status = getToolStatus(part);
  const pending = status === 'pending';
  // 进行中 / 失败默认展开（失败便于看原因）；完成后收起。用户仍可手动开合。
  const [expanded, setExpanded] = useState(pending || status === 'failed');
  const [prevStatus, setPrevStatus] = useState(status);

  if (status !== prevStatus) {
    setPrevStatus(status);
    setExpanded(pending || status === 'failed');
  }

  const title = getToolTitle(part);
  const Icon =
    status === 'failed' ? FAILED_ICON : (TOOL_ICONS[getToolName(part)] ?? FALLBACK_TOOL_ICON);
  const rows = getToolInputRows(part);
  const error = getToolError(part);

  return (
    <Think
      className={styles.tool}
      classNames={{ status: styles.status, content: styles.content }}
      icon={<Icon />}
      loading={pending}
      blink={pending}
      title={
        <>
          {pending ? getPendingTitle(title) : title}
          {status === 'failed' ? (
            <Typography.Text type="danger"> · {FAILED_LABEL}</Typography.Text>
          ) : null}
        </>
      }
      expanded={expanded}
      onExpand={setExpanded}
    >
      {rows.length > 0 ? (
        <dl className={styles.rows}>
          {rows.map((row) => (
            <div key={row.key} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
    </Think>
  );
}
