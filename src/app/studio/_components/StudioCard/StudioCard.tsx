import { Button, Card, Input, Popconfirm } from 'antd';
import { useState, type MouseEvent, type MouseEventHandler, type ReactNode } from 'react';
import {
  AI_ASSIST_BUTTON,
  CANCEL_BUTTON,
  DELETE_BUTTON,
  DELETE_CONFIRM_TITLE,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from './constants';
import { useCardAiAssist } from './hooks/useCardAiAssist';
import styles from './StudioCard.module.css';

export type StudioCardEditPlacement = 'extra' | 'body';

export type StudioCardMetaItem = {
  label: string;
  value: string;
};

export type StudioCardProps = {
  title?: ReactNode;
  /** 自定义 extra；`editable` 且 `editPlacement="extra"` 时由组件接管。 */
  extra?: ReactNode;
  selected?: boolean;
  /** 可点选：pointer 光标；未显式传 hoverable 时一并开启。编辑态自动关闭。 */
  interactive?: boolean;
  hoverable?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** 非编辑态正文；优先于 value / metaItems。样式由本组件提供，勿在调用方覆盖卡片样式。 */
  children?: ReactNode;
  /** 次要信息行（如切入卡张力/理由）；与 value 二选一或并存于 value 之下。 */
  metaItems?: StudioCardMetaItem[];
  /** 正文左侧序号徽标（如写作要点）。 */
  index?: number;

  editable?: boolean;
  /** 受控编辑态；不传则为组件内非受控。 */
  editing?: boolean;
  value?: string;
  onSave?: (value: string) => void;
  onEditingChange?: (editing: boolean) => void;
  /** 编辑入口与取消/保存位置；默认 body。 */
  editPlacement?: StudioCardEditPlacement;
  /** 传则开启删除（二次确认）；与 removable 配合可临时隐藏。 */
  onRemove?: () => void;
  /** 有 onRemove 时默认 true；置 false 可隐藏删除（如仅剩一条）。 */
  removable?: boolean;
  /** 删除确认文案；默认「确认删除？」。 */
  deleteConfirmTitle?: string;
  textareaRows?: number;
  textareaAutoSize?: boolean | { minRows?: number; maxRows?: number };
  onAiAssist?: (draft: string) => Promise<string>;
  /** 编辑区额外 class（如与自定义标题缩进对齐）。 */
  editorClassName?: string;
};

/**
 * 工作室通用小卡片：统一选中描边、点选交互、正文/次要文案样式与可选编辑/删除态。
 * 卡片视觉以本组件为准，调用方不应再覆盖卡片相关样式。
 */
export default function StudioCard({
  title,
  extra,
  selected = false,
  interactive = false,
  hoverable,
  onClick,
  children,
  metaItems,
  index,
  editable = false,
  editing: editingProp,
  value = '',
  onSave,
  onEditingChange,
  editPlacement = 'body',
  onRemove,
  removable = true,
  deleteConfirmTitle = DELETE_CONFIRM_TITLE,
  textareaRows = 2,
  textareaAutoSize,
  onAiAssist,
  editorClassName,
}: StudioCardProps) {
  const isControlled = editingProp !== undefined;
  const [uncontrolledEditing, setUncontrolledEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isEditing = isControlled ? editingProp : uncontrolledEditing;
  const { assistLoading, runAssist, invalidateAssist } = useCardAiAssist(onAiAssist, setDraft);
  const canRemove = Boolean(onRemove) && removable;

  const canInteract = interactive && !isEditing;
  const canHover = hoverable ?? canInteract;
  const rootClass = [
    styles.card,
    canInteract ? styles.interactive : '',
    selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  const setEditing = (next: boolean) => {
    if (!isControlled) setUncontrolledEditing(next);
    onEditingChange?.(next);
  };

  const startEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    invalidateAssist();
    setDraft(value);
    setEditing(true);
  };

  const cancelEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    invalidateAssist();
    setDraft('');
    setEditing(false);
  };

  const saveEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    const next = draft.trim();
    if (!next) return;
    onSave?.(next);
    invalidateAssist();
    setDraft('');
    setEditing(false);
  };

  const renderExtraActions = () => {
    if (!editable || editPlacement !== 'extra') return extra;
    if (isEditing) {
      return (
        <span onClick={(event) => event.stopPropagation()}>
          <Button type="link" size="small" disabled={assistLoading} onClick={cancelEdit}>
            {CANCEL_BUTTON}
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!draft.trim() || assistLoading}
            onClick={saveEdit}
          >
            {SAVE_BUTTON}
          </Button>
        </span>
      );
    }
    return (
      <Button type="link" size="small" onClick={startEdit}>
        {EDIT_BUTTON}
      </Button>
    );
  };

  const renderEditor = () => {
    const withAiPad = Boolean(onAiAssist);
    return (
      <div
        className={[withAiPad ? styles.editorWrap : styles.editRow, editorClassName]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        <Input.TextArea
          className={withAiPad ? styles.editor : undefined}
          value={draft}
          rows={textareaAutoSize ? undefined : textareaRows}
          autoSize={textareaAutoSize}
          autoFocus
          disabled={assistLoading}
          onChange={(event) => setDraft(event.target.value)}
        />
        {onAiAssist ? (
          <span className={styles.aiAssist}>
            <Button
              type="link"
              size="small"
              loading={assistLoading}
              disabled={assistLoading}
              onClick={() => void runAssist(draft)}
            >
              {AI_ASSIST_BUTTON}
            </Button>
          </span>
        ) : null}
        {editPlacement === 'body' ? (
          <div className={styles.actions}>
            <Button size="small" disabled={assistLoading} onClick={cancelEdit}>
              {CANCEL_BUTTON}
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!draft.trim() || assistLoading}
              onClick={saveEdit}
            >
              {SAVE_BUTTON}
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderBodyContent = () => {
    if (children) return <div className={styles.bodyStack}>{children}</div>;
    return (
      <div className={styles.bodyStack}>
        {value ? <p className={styles.bodyText}>{value}</p> : null}
        {metaItems?.map((item) => (
          <p key={item.label} className={styles.meta}>
            {item.label}：{item.value}
          </p>
        ))}
      </div>
    );
  };

  const renderRemoveAction = () => {
    if (!canRemove) return null;
    return (
      <span className={styles.displayActions} onClick={(event) => event.stopPropagation()}>
        <Popconfirm
          title={deleteConfirmTitle}
          okText={DELETE_BUTTON}
          cancelText={CANCEL_BUTTON}
          okButtonProps={{ danger: true }}
          onConfirm={onRemove}
        >
          <Button size="small" type="link" danger className={styles.actionBtn}>
            {DELETE_BUTTON}
          </Button>
        </Popconfirm>
      </span>
    );
  };

  const renderDisplay = () => {
    const indexBadge =
      index != null ? (
        <span className={styles.index} aria-hidden>
          {index}
        </span>
      ) : null;
    const body = renderBodyContent();
    const showBodyActions = editable && editPlacement === 'body';

    if (!showBodyActions) {
      if (!indexBadge) return body;
      return (
        <div className={styles.displayMain}>
          {indexBadge}
          {body}
        </div>
      );
    }

    return (
      <div className={styles.displayRow}>
        <div className={styles.displayMain}>
          {indexBadge}
          {body}
        </div>
        {renderRemoveAction()}
        <Button type="link" size="small" className={styles.actionBtn} onClick={startEdit}>
          {EDIT_BUTTON}
        </Button>
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={title}
      extra={renderExtraActions()}
      hoverable={canHover}
      className={rootClass}
      onClick={canInteract ? onClick : undefined}
    >
      {isEditing ? renderEditor() : renderDisplay()}
    </Card>
  );
}
