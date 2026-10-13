import { Button, Input, Popconfirm } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  THREAD_ADVANCE_LABEL,
  THREAD_CORE_LABEL,
  THREAD_DELETE_CONFIRM_TITLE,
  THREAD_NAME_LABEL,
} from '../../../constants';
import type { NovelThread, NovelVolumeOutline } from '../../../types';
import styles from '../card.module.css';
import { isSavableThread, threadToDraft, trimThread } from './utils';

type ThreadCardProps = {
  thread: NovelThread;
  index: number;
  volumes: NovelVolumeOutline[];
  removable: boolean;
  /** 尚未写入方案的新主线；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelThread) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一条主线：默认只读，编辑后在卡片右下角取消或保存。 */
export default function ThreadCard({
  thread,
  index,
  volumes,
  removable,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: ThreadCardProps) {
  const volumeIds = volumes.map((volume) => volume.id);
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => threadToDraft(thread, volumeIds));
  const canSave = isSavableThread(draft, volumeIds);

  function startEdit() {
    setDraft(threadToDraft(thread, volumeIds));
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
    if (!canSave) return;
    onSave(trimThread(thread.id, draft, volumeIds));
    setEditing(false);
  }

  function setAdvance(volumeId: string, text: string) {
    setDraft({ ...draft, advances: { ...draft.advances, [volumeId]: text } });
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{THREAD_NAME_LABEL}</p>
            <Input
              value={draft.name}
              placeholder={THREAD_NAME_LABEL}
              autoFocus
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{THREAD_CORE_LABEL}</p>
            <Input.TextArea
              value={draft.core}
              placeholder={THREAD_CORE_LABEL}
              autoSize={{ minRows: 2, maxRows: 8 }}
              onChange={(event) => setDraft({ ...draft, core: event.target.value })}
            />
          </div>
          {volumes.map((volume) => (
            <div key={volume.id} className={styles.field}>
              <p className={styles.fieldLabel}>
                {THREAD_ADVANCE_LABEL} · {volume.title || volume.id}
              </p>
              <Input.TextArea
                value={draft.advances[volume.id] ?? ''}
                placeholder={`${THREAD_ADVANCE_LABEL} · ${volume.title || volume.id}`}
                autoSize={{ minRows: 2, maxRows: 6 }}
                onChange={(event) => setAdvance(volume.id, event.target.value)}
              />
            </div>
          ))}
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
          <span title={thread.name}>{thread.name}</span>
        </span>
      }
      extra={
        <span className={styles.extra}>
          {removable && onDelete ? (
            <Popconfirm
              title={THREAD_DELETE_CONFIRM_TITLE}
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
      <div className={styles.readStack}>
        <div>
          <p className={styles.readLabel}>{THREAD_CORE_LABEL}</p>
          <p className={styles.readText}>{thread.core}</p>
        </div>
        {volumes.map((volume) => {
          const advance = thread.advances.find((item) => item.volumeId === volume.id);
          return (
            <div key={volume.id}>
              <p className={styles.readLabel}>
                {THREAD_ADVANCE_LABEL} · {volume.title || volume.id}
              </p>
              <p className={styles.readText}>{advance?.text ?? ''}</p>
            </div>
          );
        })}
      </div>
    </StudioCard>
  );
}
