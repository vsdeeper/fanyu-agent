import { Card } from 'antd';
import type { MouseEventHandler, ReactNode } from 'react';
import styles from './SelectableCard.module.css';

export type SelectableCardProps = {
  title?: ReactNode;
  extra?: ReactNode;
  selected?: boolean;
  /** 可点选：pointer 光标；未显式传 hoverable 时一并开启。 */
  interactive?: boolean;
  hoverable?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
};

/**
 * 工作室通用可选中小卡片：统一选中描边、标题栏高度与点选交互。
 */
export default function SelectableCard({
  title,
  extra,
  selected = false,
  interactive = false,
  hoverable,
  className,
  onClick,
  children,
}: SelectableCardProps) {
  const canHover = hoverable ?? interactive;
  const rootClass = [
    styles.card,
    interactive ? styles.interactive : '',
    selected ? styles.selected : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      size="small"
      title={title}
      extra={extra}
      hoverable={canHover}
      className={rootClass}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}
