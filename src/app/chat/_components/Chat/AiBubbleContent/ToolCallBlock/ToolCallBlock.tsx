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
 * 工具调用块：折叠时一行「工具名 · 关键入参」，点开看全量入参（如生图 prompt 全文）。
 * 调用中转圈，失败时标题追加「失败」并在正文给出原因；展开态由用户自己控制，不跟随状态自动开合。
 */
export default function ToolCallBlock({ part }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const status = getToolStatus(part);
  const pending = status === 'pending';
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
