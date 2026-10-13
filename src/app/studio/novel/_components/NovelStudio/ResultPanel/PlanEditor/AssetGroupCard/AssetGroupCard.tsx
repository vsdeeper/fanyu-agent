import { Button, Input, Popconfirm } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  ASSET_CATEGORY_LABEL,
  ASSET_GROUP_DELETE_CONFIRM_TITLE,
  ASSET_ITEMS_LABEL,
  ASSET_ITEMS_PLACEHOLDER,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
} from '../../../constants';
import type { NovelWorldAssetGroup } from '../../../types';
import styles from '../card.module.css';
import { assetGroupToDraft, isSavableAssetGroup, trimAssetGroup } from './utils';

type AssetGroupCardProps = {
  group: NovelWorldAssetGroup;
  index: number;
  /** 尚未写入方案的新分组；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelWorldAssetGroup) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一组物质基础：功能，以及按行填写的要素名。 */
export default function AssetGroupCard({
  group,
  index,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: AssetGroupCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => assetGroupToDraft(group));
  const canSave = isSavableAssetGroup(draft);

  function startEdit() {
    setDraft(assetGroupToDraft(group));
    setEditing(true);
  }

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    const next = trimAssetGroup(group.id, draft);
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{ASSET_CATEGORY_LABEL}</p>
            <Input
              value={draft.category}
              placeholder={ASSET_CATEGORY_LABEL}
              autoFocus
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{ASSET_ITEMS_LABEL}</p>
            <Input.TextArea
              value={draft.itemsText}
              placeholder={ASSET_ITEMS_PLACEHOLDER}
              autoSize={{ minRows: 2, maxRows: 8 }}
              onChange={(event) => setDraft({ ...draft, itemsText: event.target.value })}
            />
          </div>
          <div className={styles.actions}>
            <Button size="small" onClick={cancelEdit}>
              {CANCEL_BUTTON}
            </Button>
            <Button size="small" type="primary" disabled={!canSave} onClick={saveEdit}>
              {SAVE_BUTTON}
            </Button>
          </div>
        </div>
      </StudioCard>
    );
  }

  return (
    <StudioCard
      title={
        <span className={styles.title}>
          <span className={styles.index}>{index + 1}</span>
          <span title={group.category}>{group.category}</span>
        </span>
      }
      extra={
        <span className={styles.extra}>
          {onDelete ? (
            <Popconfirm
              title={ASSET_GROUP_DELETE_CONFIRM_TITLE}
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
          <Button type="link" size="small" onClick={startEdit}>
            {EDIT_BUTTON}
          </Button>
        </span>
      }
    >
      <p className={styles.readText}>{group.items.join('、')}</p>
    </StudioCard>
  );
}
