import { Button, Popconfirm } from 'antd';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import { CONFIRM_CANCEL, DELETE_BUTTON } from '../../../constants';
import styles from './ItemActions.module.css';

type ItemActionsProps = {
  editing: boolean;
  canSave: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  /** 有删除时才出现确认框；新条目用取消代替删除。 */
  deleteTitle?: string;
  onDelete?: () => void;
};

/** 条目上的编辑、取消、保存，和删除放在同一侧。 */
export default function ItemActions({
  editing,
  canSave,
  deleteTitle,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: ItemActionsProps) {
  return (
    <div className={styles.actions}>
      {editing ? (
        <>
          <Button size="small" onClick={onCancel}>
            {CANCEL_BUTTON}
          </Button>
          <Button size="small" type="primary" disabled={!canSave} onClick={onSave}>
            {SAVE_BUTTON}
          </Button>
        </>
      ) : (
        <Button type="link" size="small" className={styles.editButton} onClick={onEdit}>
          {EDIT_BUTTON}
        </Button>
      )}
      {onDelete && deleteTitle ? (
        <Popconfirm
          title={deleteTitle}
          okText={DELETE_BUTTON}
          cancelText={CONFIRM_CANCEL}
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Button type="text" danger size="small">
            {DELETE_BUTTON}
          </Button>
        </Popconfirm>
      ) : null}
    </div>
  );
}
